---
title: 容器网络学习笔记
date: 2021/2/4 17:30:00
---

容器技术涉及的知识点很多，包括进程隔离、容器网络、分层存储等等，我对其中容器网络部分很感兴趣，并有较为深入的学习。此篇文章用于记录我的学习笔记。


<!--more-->


## 概述

提到容器技术，大家可能知道容器通过 Linux Namespace 技术实现资源隔离。Namespace 是 kernel 对全局系统资源的一种封装隔离，比如 PID、User、Network 等等，改变 namespace 中被隔离的系统资源，只会影响当前 namespace 中的进程，对其他 namespace 中的进程没有影响。

Network namespace 就是本文主要涉及的一个 namespace，它被用来隔离网络设备、IP 地址端口等，每个 namespace 都有自己独立的网络协议栈、IP 路由表、防火墙规则、sockets等。

有了不同的 network namespace 之后，也就有了网络隔离，但一个完全被隔离的网络环境没有实际用处，这就需要通过 Linux 的虚拟网络设备为其插上“网卡”，以连通更多的网络。Linux 虚拟网络设备很多，这里主要介绍的是构建容器网络要用到的 Veth 与 Bridge，前者可以连接两个被隔离的 network namespace，后者则可以让更多的 network namespace 加入进来。



## Linux Veth

### Linux 网络设备

Linux 的网络设备就像一个双向的管道，数据从一端进，就会从另一端出，关键要看这两端是什么。用常见的 eth0 举例，eth0 设备的一端连接网络协议栈，另一端连接网卡。用户通过 socket api 调用，经过 Linux 网络协议栈，进入 eth0 网络设备，最后发送到网卡。

```
+-------------------------------------------+
|                                           |
|        +-------------------+              |
|        | User Application  |              |
|        +-------------------+              |   
|                 |                         |     
|.................|.........................|
|                 ↓                         |     
|           +----------+                    |     
|           | socket   |                    |     
|           +----------+                    |     
|                 |                         |     
|.................|.........................|
|                 ↓                         |     
|      +------------------------+           |     
|      | Newwork Protocol Stack |           |     
|      +------------------------+           |     
|                 |                         |     
|.................|.........................|
|                 ↓                         |     
|        +----------------+                 |     
|        |      eth0      |                 |     
|        +----------------+                 |     
|                 |                         |
|                 |                         |
|                 |                         |
+-----------------|-------------------------+
                  ↓
          Physical Network
```



### Veth Pair

Veth 作为 Linux 的虚拟网络设备，它总是成对（pair）出现，它的一端连接着网络协议栈，另一端两个设备彼此相连。这个特性使得一个设备收到协议栈的数据请求后，会将数据发送到另一个设备上去。

```
+----------------------------------------------------------------+
|                                                                |
|       +------------------------------------------------+       |
|       |             Newwork Protocol Stack             |       |
|       +------------------------------------------------+       |
|              ↑               ↑               ↑                 |
|..............|...............|...............|.................|
|              ↓               ↓               ↓                 |
|        +----------+    +-----------+   +-----------+           |
|        |   eth0   |    |   veth0   |   |   veth1   |           |
|        +----------+    +-----------+   +-----------+           |
|              ↑               ↑               ↑                 |
|              |               +---------------+                 |
|              |         192.168.2.11     192.168.2.1            |
+--------------|-------------------------------------------------+
               ↓
         Physical Network
```

可以通过这个特性，实现两个 network namespace 网络的互通。

#### 示例

通过示例创建 network namespace 与 veth pair，并实现网络互通。

```shell
# 创建 network namespace
root@ubuntu:~$ ip netns add net0
root@ubuntu:~$ ip netns add net1
# 创建 veth pair
# 因为未指定名称，会默认生成 veth0 和 veth1，如果有其他 veth 设备序号会顺延
# 如果想指定名字：ip link add vethfoo type veth peer name vethbar
root@ubuntu:~$ ip link add type veth
# 将 veth0 设备转给 net0 namespace
root@ubuntu:~$ ip link set dev veth0 netns net0
# 将 veth1 设备转给 net1 namespace
root@ubuntu:~$ ip link set dev veth1 netns net1
# 分别设置设备 IP
# ip netns exec 命令是进入 network namespace 内执行指令
root@ubuntu:~$ ip netns exec net0 ip addr add 192.168.2.11/24 dev veth0
root@ubuntu:~$ ip netns exec net1 ip addr add 192.168.2.1/24 dev veth1
# 启动 veth pair
root@ubuntu:~$ ip netns exec net0 ip link set dev veth0 up
root@ubuntu:~$ ip netns exec net1 ip link set dev veth1 up
# 尝试 ping
root@ubuntu:~$ ip netns exec net0 ping -c1 192.168.2.1
PING 192.168.2.1 (192.168.2.1) from 192.168.2.11 veth0: 56(84) bytes of data.
64 bytes from 192.168.2.1: icmp_seq=1 ttl=64 time=0.032 ms

--- 192.168.2.1 ping statistics ---
1 packets transmitted, 1 received, 0% packet loss, time 0ms
```



### Network namespace

多记一些 network namespace 相关的知识点。

每个新的 network namespace 创建之后默认会有一个 lo 设备，除此之外的其他网络设备就需要创建或移动过来。注意 lo 设备默认是关闭的，需要自己手动启动。

```shell
root@ubuntu:~$ ip netns add net0
root@ubuntu:~$ ip netns exec net0 ip link
lo: <LOOPBACK> mtu 65536 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
```

上面的示例中将 veth pair 设备分别给了两个 namespace，但被标记为“local device”的设备不能被移动，比如 loopback、bridge、ppp 等。可以通过 `ethtool -k` 命令查看设备的 `netns-local` 属性：

```shell
root@ubuntu:~$ ethtool -k lo|grep netns-local
netns-local: on [fixed]
root@ubuntu:~$ ethtool -k veth0|grep netns-local
netns-local: off [fixed]
```



## Linux Bridge

虽然 veth pair 可以实现两个 network namespace 之间的通信，但是当多个 namespace 需要通信的时候，就需要 bridge 了。bridge 同样是 Linux 虚拟网络设备，具有网络设备的特征，可以配置 IP、MAC 地址等，但 bridge 同时也是一个虚拟交换机，和物理交换机有类似的功能。

对于普通的网络设备来说，只有两个端口，从一端进来的数据会从另一端出去。而 bridge 不同，bridge 有多个端口，数据可以从任何端口进来，进来之后从哪个端口出去和物理交换机的原理差不多，要看 MAC 地址。

所以，要想实现多 network namespace 的网络通信，就需要 bridge 这个虚拟交换机。



### 使用 bridge 连接不同的 namespace

首先创建并启动 bridge，将其取名为 br0：

```shell
root@ubuntu:~$ ip link add name br0 type bridge
root@ubuntu:~$ ip link set br0 up
root@ubuntu:~$ ip link
br0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UNKNOWN mode DEFAULT group default qlen 1000
    link/ether 9a:a8:84:37:d4:56 brd ff:ff:ff:ff:ff:ff
```

同样，network namespace 也要准备好：

```shell
root@ubuntu:~$ ip netns add net0
root@ubuntu:~$ ip netns add net1
```

#### 示例

现在两个网络环境与虚拟交换机都已准备好，接下来将使用 veth pair 进行连接互通：

```shell
# 创建 net0 使用的 veth pair
root@ubuntu:~$ ip link add type veth
# 将 veth0 移至 net0
root@ubuntu:~$ ip link set dev veth0 netns net0
# 设置 IP 并启动
root@ubuntu:~$ ip netns exec net0 ip addr add 192.168.2.11/24 dev veth0
root@ubuntu:~$ ip netns exec net0 ip link set dev veth0 up
# 将其对应的另一个设备 attach 到 bridge 上并启动
root@ubuntu:~$ ip link set dev veth1 master br0
root@ubuntu:~$ ip link set dev veth1 up
# net1 同理
root@ubuntu:~$ ip link add type veth
root@ubuntu:~$ ip link set dev veth0 netns net1
root@ubuntu:~$ ip netns exec net1 ip addr add 192.168.2.1/24 dev veth0
root@ubuntu:~$ ip netns exec net1 ip link set dev veth0 up
root@ubuntu:~$ ip link set dev veth2 master br0
root@ubuntu:~$ ip link set dev veth2 up
```

测试 ping：

```shell
root@ubuntu:~$ ip netns exec net0 ping -c1 192.168.2.1
PING 192.168.2.1 (192.168.2.1) 56(84) bytes of data.
64 bytes from 192.168.2.1: icmp_seq=1 ttl=64 time=0.045 ms

--- 192.168.2.1 ping statistics ---
1 packets transmitted, 1 received, 0% packet loss, time 0ms
```

Veth pair 在此时的作用就相当于网线，一头（veth0）连着容器（network namespace），另一头（veth1）连着交换机（bridge）。bridge 作为交换机，当有设备 attach 到 bridge，就相当于交换机上插了一个新网线。当有请求到达 bridge 设备时，就可以通过报文中的 MAC 地址进行广播、转发、丢弃处理。



### 给 bridge 配上 IP

Bridge 与现实世界的二层交换机有一个区别：数据可以直接被发到 bridge 上，而不是从一个端口接受。这种情况可以看做 bridge 自己有一个 MAC 可以主动发送报文，或者说 bridge 自带了一个隐藏端口和寄主 Linux 系统自动连接，Linux 上的程序可以直接从这个端口向 bridge 上的其他端口发数据。

由此带来一个有意思的事情是，bridge 可以设置 IP 地址。通常来讲 IP 地址是三层协议的内容，不应该出现在二层设备 bridge 上，但 bridge 是虚拟交换机，属于通用网络设备的抽象的一种，只要是网络设备就能够设定 IP 地址。

当一个 bridge 拥有 IP 后，Linux 便可以通过路由表或者 IP 表规则在三层定位 bridge，此时相当于 Linux 拥有了另外一个隐藏的虚拟网卡和 bridge 的隐藏端口相连，这个网卡就是名为 br0 的通用网络设备，IP 可以看成是这个网卡的。当有符合此 IP 的数据到达 br0 时，内核协议栈认为收到了一包目标为本机的数据，此时应用程序可以通过 socket 接收到它。

#### 示例

接上文环境，为 bridge 配置 IP：

```shell
root@ubuntu:~$ ip addr add 192.168.2.12/24 dev br0
```

在主机上尝试 ping net0：

```shell
root@ubuntu:~$ ping -I br0 -c1 192.168.2.11
PING 192.168.2.11 (192.168.2.11) from 192.168.2.12 br0: 56(84) bytes of data.
64 bytes from 192.168.2.11: icmp_seq=1 ttl=64 time=0.057 ms

--- 192.168.2.11 ping statistics ---
1 packets transmitted, 1 received, 0% packet loss, time 0ms
```

在 net1 中尝试 ping br0:

```shell
root@ubuntu:~$ ip netns exec net1 ping -c1 192.168.2.12
PING 192.168.2.12 (192.168.2.12) 56(84) bytes of data.
64 bytes from 192.168.2.12: icmp_seq=1 ttl=64 time=0.061 ms

--- 192.168.2.12 ping statistics ---
1 packets transmitted, 1 received, 0% packet loss, time 0ms
```



## 与外部网络通信

上文给 bridge 配置 IP 后，network namespace 已经可以通过 br0 与宿主机的网络协议栈通信，但我们还需要与外部的网络通信。

其中的一种方法是将物理网卡设备 eth0 也 attach 到 br0 上。br0 根本不区分 attach 的是物理设备还是虚拟设备，对它来说都一样，都是网络设备，这就相当于 br0 拥有了一条连接外部物理设备的网线。此时连接到 br0 的 network namespace 都可以通过 br0 访问外部网络。但由于我是使用的云主机，通过 ssh 连接，无法很方便的调试，所以没有试过这种方法。

上一种方法不需要经过宿主机网络协议栈，直接就可以通过 eth0 设备发送数据。而第二种方法，可以不接入 eth0 设备，而是通过 IP forward 将数据转发。同时由于 network namespace 是分配的内网 IP，所以一般在发出去之前还需要经过 NAT 转换。



### IP forward

“IP forwarding” 和 “routing” 是同义词，因为属于 Linux 内核的特性，所以也被叫做 “kernel IP forwarding”。所谓转发的概念就是 Linux 内核实现了路由器的功能，根据数据包的 IP 地址将数据从一个网络发送到另一个网络，该网络根据路由表配置继续发送数据包。

出于安全考虑，Linux 默认是禁止数据包转发的。如果想要启用，需要修改内核参数 `net.ipv4.ip_forward`。这个参数的值指定了是否启用转发功能；为 0 时禁用，为 1 时表示启用。

```shell
root@ubuntu:~$ sysctl net.ipv4.ip_forward
net.ipv4.ip_forward = 0
# 也可以通过 /proc 查看
root@ubuntu:~$ cat /proc/sys/net/ipv4/ip_forward
0
```

#### 修改内核参数

**临时生效**

```shell
root@ubuntu:~$ sysctl -w net.ipv4.ip_forward=1
net.ipv4.ip_forward = 1
# 或直接修改 /proc 文件
root@ubuntu:~$ echo 1 > /proc/sys/net/ipv4/ip_forward
```

**永久生效**

修改 `sysctl.conf` 文件，找到 `net.ipv4.ip_forward` 配置项，修改为 1：

```shell
root@ubuntu:~$ vi /etc/sysctl.conf
# 需要在当前环境中刷新更改
root@ubuntu:~$ sysctl -p /etc/sysctl.conf
```



### NAT

**网络地址转换** NAT（Network Address Translation）的作用是将数据包中的 network namespace 内网 IP 转为主机所拥有的公网 IP。

NAT 根据数据流向可以分为两种：SNAT 是源 IP 转换，将发送的数据包中的源 IP 转为公网 IP；DNAT 是目标 IP 转换，将接收到的数据包中的公网 IP 转为 network namespace 的内网 IP。



### netfilter/iptables

无论是 IP forward 还是 NAT，在 Linux 系统上都可以通过 netfilter/iptables 配置规则。netfilter 和 iptables 可以拆开来说，netfilter 指的是整个[项目](https://www.netfilter.org)，在这个项目中 netfilter 特指内核中的 netfilter 框架，而我们更熟悉的 iptables 则是用户空间的配置工具，用于与 netfilter 框架打交道。

#### netfilter 框架

netfilter 在内核协议栈的 IP 层添加了几个钩子（hooks），允许内核模块在这些钩子的地方注册回调函数，这样经过钩子的所有数据包都会被注册在相应钩子上的函数所处理，包括修改数据包内容或者丢弃数据包等等。

netfilter 框架负责维护钩子上注册的处理函数或者模块，以及它们的优先级。

#### iptables

iptables 是用户空间的一个程序，与内核的 neifilter 框架打交道，根据规则在钩子上配置回调函数。

iptables 用表（table）来分类管理它的规则（rule），根据 rule 的作用可以分类为几个表，比如用于过滤数据的 filter 表，用于处理 NAT 规则的 nat 表等等。

#### conntrack

onntrack 是 netfilter 实现 NAT 的基础，当加载内核模块 `nf_conntrack` 后，connection tracking 机制就开始工作，它工作在 `NF_IP_PRE_ROUTING` 和 `NF_IP_LOCAL_OUT` 这两个钩子处。它会追踪每个数据包（被 raw 表中的 rule 标记过的除外），并生成 conntrack 条目用于追踪此连接，对于后续通过的数据包，内核会判断若此数据包属于某个连接，则会更新对应的 conntrack 条目。

所有的 conntrack 条目都存放在一张表里，称为连接跟踪表。可以用 `cat /proc/net/nf_conntrack` 来查看当前的所有连接。下面是所有的连接状态：

- NEW：当检测到一个不和任何现有连接关联的新包时，如果该包是一个合法的建立连接的数据包，一个新的连接将会被保存，并且标记为状态 NEW。
- ESTABLISHED：对于状态是 NEW 的连接，当检测到一个相反方向的包时，连接的状态将会由 NEW 变成 ESTABLISHED，表示连接成功建立。对于TCP连接，意味着收到了一个 SYN/ACK 包， 对于 UDP 和 ICMP，任何反方向的包都可以。
- RELATED：数据包不属于任何现有的连接，但它跟现有的状态为 ESTABLISHED 的连接有关系，对于这种数据包，将会创建一个新的连接，且状态被标记为 RELATED。这种连接一般是辅助连接，比如 FTP 的数据传输连接（FTP 有两个连接，另一个是控制连接），或者和某些连接有关的ICMP报文。
- INVALID：数据包不和任何现有连接关联，并且不是一个合法的建立连接的数据包，对于这种连接，将会被标记为 INVALID，一般这种都是垃圾数据包，比如收到一个 TCP 的 RST 包，但实际上没有任何相关的 TCP 连接，或者别的地方误发过来的 ICMP 包。
- UNTRACKED：被 raw 表里面的 rule 标记为不需要 tracking 的数据包，这种连接将会标记成 UNTRACKED。



### 示例

创建 bridge，并配置 IP：

```shell
root@ubuntu:~$ ip link add br0 type bridge
root@ubuntu:~$ ip link set dev br0 up
root@ubuntu:~$ ip addr add 192.168.2.1/24 dev br0
```

创建 network namespace 并与 bridge 相连：

```shell
root@ubuntu:~$ ip netns add net0
root@ubuntu:~$ ip link add type veth
root@ubuntu:~$ ip link set veth0 netns net0
root@ubuntu:~$ ip netns exec net0 ip link set dev veth0 up
root@ubuntu:~$ ip link set veth1 up
root@ubuntu:~$ ip link set veth1 master br0
root@ubuntu:~$ ip netns exec net0 ip addr add 192.168.2.11/24 dev veth0
```

修改 net0 路由表，默认网关设置为 br0：

```shell
root@ubuntu:~$ ip netns exec net0 ip route add 0.0.0.0/0 via 192.168.2.1 dev veth0 onlink
```

注意 IP forward 配置：

```shell
root@ubuntu:~$ sysctl -w net.ipv4.ip_forward=1
net.ipv4.ip_forward = 1
```

屏蔽环境干扰，先默认不允许转发：

```shell
root@ubuntu:~$ iptables -P FORWARD DROP
```

开始配置 iptables rules，首先设置 bridge 转发规则，此条规则的意思是允许 br0 转发给 eth0：

```shell
root@ubuntu:~$ iptables -A FORWARD -i br0 -o eth0 -j ACCEPT
```

接下来配置 SNAT 规则：

```shell
root@ubuntu:~$ iptables -t nat -A POSTROUTING -s 192.168.2.0/24 -j SNAT --to # to eth0 ip
# 也可以直接配置在 eth0 上
root@ubuntu:~$ # iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
```

netfilter 通过 conntrack 来实现 NAT 转换，所以我们要对 `RELATED,ESTABLISHED` 状态的包予以通行：

```shell
root@ubuntu:~$ iptables -A FORWARD -o br0 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
```

通过上面的配置，conntrack 状态监测到是回包的数据包，都给予通行，而后回包经过 conntrack 表会变为原始 IP 关系，相当于 DNAT 转换。

在 network namespace 中使用 ping 来测试访问外部网络：

```bash
root@ubuntu:~$ ip netns exec net0 ping -c1 110.242.68.4 # 百度的一个 IP
PING 110.242.68.4 (110.242.68.4) 56(84) bytes of data.
64 bytes from 110.242.68.4: icmp_seq=1 ttl=34 time=56.7 ms

--- 110.242.68.4 ping statistics ---
1 packets transmitted, 1 received, 0% packet loss, time 0ms
```



### 端口转发

上面的示例是从 network namespace 内部访问外部网络，可以利用 conntrack 来替代 DNAT，如果想让外部请求访问内部服务，就需要配置 DNAT 的映射规则。可映射是一对一的，一个宿主机 IP 对应一个 network namespace 的内网 IP，当我们有多个内部服务想要暴露给公网，就需要配置 NAPT 规则。

#### NAPT

网络地址与端口号转换 NAPT (Network Address andPort Translation) 就是使用端口号的 NAT，有端口号的配置，就能实现内网 IP 的多对一映射，只是映射到不同的端口上。

| 内网 IP         | 公网 IP      |
| :-------------- | :----------- |
| 192.168.2.11:80 | x.x.x.x:8080 |
| 192.168.2.1:80  | x.x.x.x:8081 |

#### 示例

除 iptables rules 外规则不变，首先是在 network namespace 中启动一个 http server：

```shell
# 注意：这会暴露当前目录下的文件
root@ubuntu:~$ ip netns exec net0 python -m SimpleHTTPServer 80
```

添加 DNAT 规则，设置主机端口为 8080，映射 net0 的 80：

```shell
root@ubuntu:~$ iptables -t nat -A PREROUTING -p tcp --dport 8080 -j DNAT --to 192.168.2.11:80
```

添加 ip forward：

```shell
root@ubuntu:~$ iptables -A FORWARD -i eth0 -d 192.168.2.0/24 -o br0 -p tcp --dport 80 -j ACCEPT
```

现在就可以通过宿主机的 IP 访问了。



## 写在最后

上述例子用于学习需要，与真实的容器配置不同，但所用的基础技术都是一样的。笔记内容主要学习和参考自 Segmentfault 用户 [public0821](https://segmentfault.com/u/public0821) 的 Linux 专栏文章，还有网络上的一些相关文章。

接下来会继续学习跨主机的容器网络搭建，这次会结合实际项目 Flannel。



### 参考文章

1. [Linux虚拟网络设备之veth](https://segmentfault.com/a/1190000009251098)
2. [Linux虚拟网络设备之bridge(桥)](https://segmentfault.com/a/1190000009491002)
3. [netfilter/iptables简介](https://segmentfault.com/a/1190000009043962)
4. [通过iptables实现端口转发和内网共享上网](http://xstarcd.github.io/wiki/Linux/iptables_forward_internetshare.html)

