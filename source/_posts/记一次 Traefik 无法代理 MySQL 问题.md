---
title: 记一次 Traefik 无法代理 MySQL 问题
date: 2020/4/13 00:00:00
---

Traefik 从 2.0 版本开始支持 TCP route，我也使用 Traefik 作为 kubernetes 集群的 Ingress，但是在使用过程中，发现 Traefik 为 MySQL 创建的 TCP route 无法正常工作，经过排查搜索后发现了官方人员关于这个疑惑的[解答](https://community.containo.us/t/v2-tcp-router-with-tls-example/2664)，以下截取片段：

> But be careful: not all protocols based on TCP and using TLS supports the SNI routing or the passthrough. It requires the protocol supporting SNI (for instance MySQL doesn't) and doing a TLS handshake (if it is a STARTTLS, then it does not work).

虽然找到了问题是由于 MySQL 不支持，但也勾起了我的好奇心，什么是 SNI？Traefik 为什么要使用 `HostSNI` 创建 TCP route 呢？为什么 MySQL 不支持 SNI 呢？于是带着这些问题，我开始寻找答案。

<!--more-->  


## TLS Extensions —— SNI

首先从了解 SNI 开始，SNI 是 TLS 的一个扩展协议。

### 什么是 TLS Extensions？

TLS 扩展于 2003 年以一个独立的规范（[RFC 3546](https://tools.ietf.org/html/rfc3546)）被提出，经过不断的发展：[RFC 4366](https://tools.ietf.org/html/rfc4366)、[RFC 6066](https://tools.ietf.org/html/rfc6066) 等，先后被加入到 TLS1.1、TLS1.2、TLS1.3 中。它能让 Client 和 Server 在不更新 TLS 的基础上，获得新的功能。

Client 在 ClientHello 中声明多个自己可以支持的 Extensions，Server 收到 ClientHello 以后，依次解析 Extensions，有些如果需要立即回应，就在 ServerHello 中作出回应，有些不需要回应，或者 Server 不支持的 Extensions 就不用响应，忽略不处理。

在 ClientHello 中，Extension 字段位于 Compression Methods 字段之后，通过 Wireshark 工具进行查看：

![github-wireshark](https://tva1.sinaimg.cn/large/007S8ZIlly1ge84vtby39j31nf0u0wt5.jpg)

### 什么是 SNI 扩展？

我们知道，在 Nginx 中可以通过指定不同的 `server_name` 来配置多个站点。HTTP/1.1 协议请求头中的 `Host` 字段可以标识出当前请求属于哪个站点。但是在 TLS 协议中，没有提供一种机制来告诉 Server 它正在建立连接的 Server 的名称，那么对于在同一个地址，并且还使用不同证书的情况下，Server 怎么知道该发送哪个证书？

于是为了解决这个问题，SNI 应运而生。SNI 全称是 Server Name Indication，[最初是 2003 年标准化的](https://tools.ietf.org/html/rfc3546#page-8)，在 [RFC 6066](https://tools.ietf.org/html/rfc6066#page5) 中有更新。它允许 Server 在同一个网络地址上托管多个启用了 TLS 的服务，要求 Client 在初始 TLS 握手期间指定要连接到哪个服务。

```c
struct {
  NameType name_type;
  select (name_type) {
  	case host_name: HostName;
  } name;
} ServerName;

enum {
	host_name(0), (255)
} NameType;

opaque HostName<1..2^16-1>;

struct {
	ServerName server_name_list<1..2^16-1>
} ServerNameList;
```

Extension type 是 `server_name`，点开上图 Wireshark 中 `server_name` 一行，查看更详细信息：

![server_name](https://tva1.sinaimg.cn/large/007S8ZIlly1ge85t4pu0uj31n80u019m.jpg)

`ServerNameList` 不能包含多个具有相同 `ServerNameType` 的名称，当前 `ServernameType` 只有 `host_name` 一种，在以后可能会添加更多类型，`host_name` 包含标准的 DNS hostname 且不含结尾点。如果 Server 支持 SNI 扩展，但不能识别 `server_name`，则应该发送 `fatal-level unrecognized_name(112)` 来终止握手或继续握手。

*更多详细的规范内容可以到 [RFC 6066](https://tools.ietf.org/html/rfc6066#page5) 中查看。[这里](https://www.iana.org/assignments/tls-extensiontype-values/tls-extensiontype-values.xhtml) 有一个扩展协议列表。*



## Traefik 的 TCP 路由与 SNI

Traefik 从 2.0 开始支持 TCP 路由，也支持在相同的 `entryPoints`（traefik 中的入口端口） 中定义不同的 TCP 路由，但是我们都知道，TCP 是传输层协议，没有任何 SNI 类的机制来保证同一地址入口可以处理不同的服务。那么，Traefik 是怎么做的呢？

### 部署基于 TLS 的 TCP 路由

答案很简单，Traefik 支持通过 SNI 在每台主机上进行路由，因为这是通过 TCP 进行路由的惟一标准方法，但是 TCP 本身没有 SNI，因此必须使用 TLS。部署配置：

```yaml
apiVersion: traefik.containo.us/v1alpha1
kind: IngressRouteTCP
metadata:
  name: example
spec:
  entryPoints:
    - web
  routes:
  - match: HostSNI(`web.example.com`)
    services:
    - name: example-service-name
      port: 80
  tls: 
    secretName: traefik-tls-certs
```

`HostSNI` 中的值对应 SNI 扩展中 `server_name` 的值，Traefik 以此来进行路由，并找到对应证书。还需要注意的是 `entryPoints` 部分由部署的 Traefik 配置中的 `entryPoints` 参数决定，此处的 `web` 是我们指定的一个 `entryPoints` 名称，端口地址对应为 80 端口：

```yaml
......
- image: traefik:2.1.1
  name: traefik
  ports:
  - name: web
    containerPort: 80
    hostPort: 80
  args:
  - --entryPoints.web.address=:80
......
```

此处使用 `hostPort` 的方式暴露入口点，是为了能够通过 Traefik 部署的节点的入口点端口直接访问到 backend service。

### 部署非 TLS 的 TCP 路由

如果有不支持 SNI/TLS 协议的应用客户端，Traefik 也可以部署 “plain TCP”，也就是标准的通过端口进行路由。此时虽然 `metch` 还是使用 `HostSNI`，但需要指定为通配符 `*`：

```yaml
apiVersion: traefik.containo.us/v1alpha1
kind: IngressRouteTCP
metadata:
  name: example
spec:
  entryPoints:
    - web
  routes:
  - match: HostSNI(`*`)
    services:
    - name: example-service-name
      port: 80
```

### 其他

使用 Traefik 代理 TLS 服务时，backend service 可不设置 TLS 相关，由 Traefik 负责全部相关机制。如果 backend service 有需要加密后的数据时，可通过 `passthrough` 参数配置，Traefik 将发送加密后的数据给 backend service：

```yaml
......
  tls: 
    secretName: traefik-tls-certs
    passthrough: true
```



## 为什么不能为 MySQL 代理

当我明白 SNI 协议以及 Traefik 如何使用 SNI/TLS 为 TCP 创建路由时，我开始研究为什么 MySQL 不能使用 SNI 扩展，甚至在 2016 年就有人提出过这个问题，但可惜一直没有人跟进：https://bugs.mysql.com/bug.php?id=82872。这让我有些疑惑，毕竟 MySQL 已经实现了 TLS 功能，为什么在有用户有需求的情况下不加上 SNI 扩展呢？毕竟这又不是过于复杂的功能。

在寻找到答案之前，让我们先简单复习下 TLS 协议的标准流程：首先是 TCP 的三次握手，随后开始 TLS 的握手，如果是 TLS1.2 或之前需要四次握手，如果是 TLS1.3 则需要三次握手，最后开始传输加密数据。

下面来看看 MySQL 的流程，输入命令：`mysql -hmysql.example.com -P3306 -uroot -pmysql --ssl-mode=REQUIRED`，使用 wireshark 查看：

*MySQL 对于 TCP 连接已经默认使用 tls，如果不想使用需要修改参数为 `--ssl-mode=DISABLED`，同时对于 localhost 默认使用 soket 连接，强制使用 TCP 连接需要增加参数: `--protocol tcp`。*

![mysql](https://tva1.sinaimg.cn/large/007S8ZIlly1ge97ghpl3ej31ja0u07t9.jpg)

上图中可以看出，在 TCP 握手后，Server 会发送 MySQL 协议 HandShake Paket：`Server Greeting proto=10 version=5.7.29`，开始 MySQL 协议的握手流程，随后 Client 发送 Auth Paket，图中为开启 TLS 认证的流程，所以并未显示 `user` 的内容，如果设置 MySQL Client 参数为 `--ssl-mode=DISABLED`，将显示认证的用户名，并且 Server 会在随后发送 `Auth Switch Request` 包继续认证流程，此处不再赘述，有兴趣的可以自己抓包看一下。

看到这里其实就已经很清晰了，MySQL 在连接时会将自定义协议握手流程置于 TLS 协议握手之前，以至于 Traefik 无法通过 TLS SNI 找到对应 backend service，也就无法发送 MySQL 的 HandShake Paket。对于 MySQL Client 来说，如果是有超时机制，会响应 `waiting for initial communication packet` 或类似的错误，如果没有超时机制，就会一直等待。

这点对于 Traefik 来说也很无奈，MySQL 自定义协议中也没有 SNI 的机制，而 TLS 又在 MySQL 协议握手之后发生，导致它完全没办法进行路由，只好期望 MySQL 能尽快修改这部分的流程。[这里](https://github.com/containous/traefik/issues/5155)有官方对于这件事的一些回复：https://github.com/containous/traefik/issues/5155



## 其他常见数据库

了解到了 MySQL 的问题，不禁让我好奇，其他的常见数据库是否也拥有相同问题，于是我又去看了 MongoDB 和 Redis。

### MongoDB

使用命令进行连接：`mongo --host mongo.example.com --port 27017 --ssl`

![mongodb](https://tva1.sinaimg.cn/large/007S8ZIlly1ge98i03x3ej31pq0u0wsp.jpg)

非常标准的流程，也支持 SNI 扩展，Traefik 可以顺利的进行路由。

### Redis

Redis 从 6.0 开始支持 SSL/TLS，但 6.0 正在处于 RC（Release　Candidate） 阶段，如果想要测试，可以下载代码后自行编译。TLS 特性是个可选特性，需要在编译时使用参数确认使用：`make BUILD_TLS=yes`。

*相关官方文档：https://redis.io/topics/encryption*

编译后尝试连接 Traefik 代理的地址：`./redis-cli --tls -h testtcp.ohuna.cloud -p 6379`，却发现 Traefik 响应了 fatal level error： `Unknown CA`：

![redis](https://tva1.sinaimg.cn/large/007S8ZIlly1ge99xitc2zj31j50u0qlj.jpg)

很明显是因为 redis 没有使用 SNI 扩展，但文档中又没有提及，所以我去 redis 源码中寻找答案。在 `tls.h` 中了解到 redis 使用了 openssl：

```c
......
#ifdef USE_OPENSSL

#include <openssl/ssl.h>
#include <openssl/err.h>
#include <openssl/rand.h>
```

于是通过 openssl 设置 SNI 的函数 `SSL_set_tlsext_host_name` 进行查找：

```c
#redis-cli.c
    if (config.sni && !SSL_set_tlsext_host_name(ssl, config.sni)) {
        *err = "Failed to configure SNI";
        SSL_free(ssl);
        return REDIS_ERR;
    }
......
  #ifdef USE_OPENSSL
        } else if (!strcmp(argv[i],"--tls")) {
            config.tls = 1;
        } else if (!strcmp(argv[i],"--sni") && !lastarg) {
            config.sni = argv[++i];
......
```

发现可以通过 `--sni` 参数进行指定，通过 `redis-cli --help` 能查看到相关说明：

```bash
redis-cli 5.9.103

Usage: redis-cli [OPTIONS] [cmd [arg [arg ...]]]
......
	--tls              Establish a secure TLS connection.
  --sni <host>       Server name indication for TLS.
```

由于粗心大意，导致耽误了时间去寻找 SNI 的设置方法，不过 redis 需要必须手动设置 SNI 的方式也是很奇怪。重新使用带有 `--sni` 参数的命令进行连接：`./redis-cli --tls -h redis.example.com -p 6379 --sni redis.example.com`，这次成功连接，查看 TLS ClientHello 中也带有 `server_name`：

![redis-success](https://tva1.sinaimg.cn/large/007S8ZIlly1ge9amao5j7j31ji0u01a4.jpg)



## 扩展阅读——ESNI

虽然关于 Traefik 与 MySQL 的问题告一段落，但 SNI 本身还有其他可学习的内容。

#### SNI 的安全问题

由于 SNI 扩展是在 TLS 握手期间通过 ClientHello 进行发送，在此时 Client 和 Server 还未共享加密密钥，因此 ClientHello 消息未被加密发送。这就意味着如果有中间人，是可以拦截明文的 ClientHello 消息，并知道 Client 将要访问的网址。

#### ESNI

当前有一项草案正在试图解决这个问题，也就是 [ESNI（Encrypted Server Name Indication）](https://tools.ietf.org/html/draft-rescorla-tls-esni-00)。

对于加密 SNI 内容这种先有鸡还是先有蛋的问题，ESNI 通过引入 DNS 来解决。服务器在已知的 DNS 记录上发布一个公钥，客户端可以在连接 Server 之前获得该公钥。然后，客户端将 ClientHello 中的 SNI 扩展替换为 ESNI，也就是使用获得的公钥对 SNI 信息对称加密。

ESNI 必须要基于 TLS1.3 版本，因为 TLS1.3 使用了 Deffie-Hellman 算法进行密钥交换，DH 算法可以使通信的双方能在非安全的信道中安全的交换密钥。否则，就算加密了 SNI，也可以通过明文证书进行验证。

如果仅仅使用 DNS 也不行，因为 DNS 默认是为加密的，所以需要使用的 DNS 支持 DNS over TLS（DoT）或 DNS over HTTPS（DoH）特性。

*简单的学习下 ESNI，更多详细内容可以通过 Cloudflare 的[文章](https://blog.cloudflare.com/zh/encrypted-sni-zh/)或[草案](https://tools.ietf.org/html/draft-rescorla-tls-esni-00)进行了解。*



## 参考和致谢

学习过程中碰到了诸多问题，幸好互联网上有着众多的学习资料，感谢以下文档与博客：

[一文搞懂 Traefik2.1 的使用](https://www.qikqiak.com/post/traefik-2.1-101/)

[HTTPS 交互过程分析](https://harttle.land/2018/03/25/https-protocols.html)

[关于启用 HTTPS 的一些经验分享（二）](https://imququ.com/post/sth-about-switch-to-https-2.html)

[HTTPS 温故知新（六） —— TLS 中的 Extensions](https://halfrost.com/https-extensions/)

[RFC 6066](https://tools.ietf.org/html/rfc6066)

[实现自己的数据库驱动——WireShark分析MySQL网络协议中的数据包（二）]([https://www.callmejiagu.com/2018/10/26/WireShark-%E5%88%86%E6%9E%90MySQL%E7%BD%91%E7%BB%9C%E5%8D%8F%E8%AE%AE%E4%B8%AD%E7%9A%84%E6%95%B0%E6%8D%AE%E5%8C%85%EF%BC%88%E4%BA%8C%EF%BC%89/](https://www.callmejiagu.com/2018/10/26/WireShark-分析MySQL网络协议中的数据包（二）/))

[不加密，无隐私：加密SNI工作原理](https://blog.cloudflare.com/zh/encrypted-sni-zh/)