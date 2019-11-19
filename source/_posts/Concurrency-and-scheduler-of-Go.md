---
title: Go 的并发性与调度器
date: 2019/03/06 20:12:19
---

本篇文章是我对 Go 语言并发性的理解总结，适合初步了解并发，对 Go 语言的并发编程与调度器原理有兴趣的读者。

<!--more-->  

### 你真的了解并发吗？

相信读者都对并发有着一定的理解，也都对 Go 语言感兴趣，Go 最吸引人的地方可能就是它的内建并发支持，使用 `go` 关键字，就可以轻松的实现并发。但是，你真正的了解**并发**吗？

并发这个词，你去问编程领域中不同的人，会给出不同的答案。对于 WEB 领域的开发人员来说，并发通常是指**同一时刻的请求量**，WEB 领域的面试官经常会问到的问题：“做过多少并发的项目？”或“接触过高并发的项目吗？”就是应用的这个概念。*高并发在这里还有个可能的概念是：**同时应对许多请求所使用的技术**，这通常与分布式、并行等概念挂钩，需要结合上下文语境来判断。*

并发是一个有趣的词，因为它对编程领域中的不同人员意味着不同的事情，在广义概念下，有着许多狭义概念。除了“并发”之外，你可能还听过“并行”、“多线程”、“异步”等词汇，有些人认为这些词意思相同，而其他人则在每个词之间划清界限。

下面，让我们看看 Go 语言编程中，“并发”这个词的概念。

### Go 语言中的并发性

Go 语言的并发性并不是 WEB 领域的并发概念，很多人对此有所混淆。在 Go 语言发布之初，大家对 Go 的并发特性都有所疑问：

* 为什么要有并发？
* 什么是并发？
* 这个想法源自哪里？
* 并发有什么好处？
* 我该如何使用它？

面对这些问题，Rob Pike（Go 语言作者之一）在2012年的 Google I/O 上做了一次精彩的演讲：[《Go Concurrency Patterns》](https://www.youtube.com/watch?v=f6kdp27TYZs)，在这场演讲中，他回答了上述问题，并通过详细的示例讲解了 goroutine、channel 与 select 的使用，建议大家都去看一看这场演讲。

简单的总结一下并发在 Go 语言编程中的概念：

**“并发是一种将程序分解成小片段独立执行的程度设计方法”，它是一种结构化程序的方式，独立执行计算的组合。**

在上述的演讲中可以看出，Go 语言推荐使用并发，我们也应该遵循这种编程方式。对于程序员来说，代码更有说服力，我们可以通过这个[素数筛选程序](https://play.golang.org/p/9U22NfrXeq)来理解 Go 的并发编程：

```go
// A concurrent prime sieve

package main

// Send the sequence 2, 3, 4, ... to channel 'ch'.
func Generate(ch chan<- int) {
	for i := 2; ; i++ {
		ch <- i // Send 'i' to channel 'ch'.
	}
}

// Copy the values from channel 'in' to channel 'out',
// removing those divisible by 'prime'.
func Filter(in <-chan int, out chan<- int, prime int) {
	for {
		i := <-in // Receive value from 'in'.
		if i%prime != 0 {
			out <- i // Send 'i' to 'out'.
		}
	}
}

// The prime sieve: Daisy-chain Filter processes.
func main() {
	ch := make(chan int) // Create a new channel.
	go Generate(ch)      // Launch Generate goroutine.
	for i := 0; i < 10; i++ {
		prime := <-ch
		print(prime, "\n")
		ch1 := make(chan int)
		go Filter(ch, ch1, prime)
		ch = ch1
	}
}
```

它并不是复杂度最低的算法，特别是寻找大素数方面，但却是最能体现 Go 并发编程、[**通过通信共享内存**](https://golang.org/doc/faq#What_operations_are_atomic_What_about_mutexes)的理念，而且非常优雅。

在这段代码中，通过 goroutine 的组合，实现一层层的筛选器，筛选器之间通过 channel 通信，每一个筛选器就是一个素数，每个给 main goroutine 通信的内容也是素数，简直精妙。

通过下面的 gif 动画能清晰的看到程序运行过程：

![primesieve](https://tva1.sinaimg.cn/large/006y8mN6ly1g85w9fqvjfg30l40c2qek.gif)

### 并发不是并行

#### Go 的并行

只需要 GOMAXPROCS 的值大于1，就可以让 Go 程序在多核机器上实现以并行的形式运行。但并发的程序一定可以并行吗？

我们需要明确一个观点：**并发不是为了效率，并发的程序不一定可以并行。**还是上面素数的例子，这段代码是并发的，但不完全是并行，因为它的每一个执行片段都需要上一个片段的筛选与通信。

#### 正交概念

*正交概念：从数学上引进正交这个词，用于表示指相互独立，相互间不可替代，并且可以组合起来。*

在广义概念上来讲，并发与并行是**正交概念**，对于 Go 语言的并发性来讲也是如此。

#### 《Concurrency is not Parallelism》

同样，在 Go 语言发布之初，有很多人混淆了并发与并行的概念，对此，Rob Pike 发表了另一篇演讲[《Concurrency is not Parallelism》](https://talks.golang.org/2012/waza.slide#1)，通过地鼠烧书的比喻与简单负载均衡器的示例，详细的阐述了并发与并行的区别。

这里不再复述地鼠例子，只是简单的总结，感兴趣的建议去看演讲：

**并行是指同时能执行多个事情。**

**并发关乎结构，是一种结构化程序的方式。**

**并行关乎执行，表述的是程序的运行状态。**

### Go 语言是如何支持并发的？

上面一直在讲 Go 语言的并发性，接下来看下 Go 语言是如何做到的并发支持。

我们在使用 Go 编写并发程序的过程中，无需关心线程的维护、调度等一系列问题，只需要关心程序结构的分解与组合、goroutine 之间的通信就可以写出良好的并发程序，这全部都要依赖于 Go 语言内建的 G-P-M 模型。

#### 模型演化过程

在 Go 语言1.0版本时，只有 G-M 模型，Google 工程师 Dmitry Vyukov 在[**《Scalable Go Scheduler Design Doc》**](https://docs.google.com/document/d/1TTj4T2JO42uD5ID9e89oa0sLKhJYD0Y_kqxDv3I3XMw/edit)中指出了该模型在并发伸缩性方面的问题：

> 1. 所有对 G 的操作：创建、重新调用等由单个全局锁(Sched.Lock)保护，浪费时间。
> 2. 当 M 阻塞时，G 需要传递给别的 M 执行，这导致调度延迟增大以及额外的性能损耗；
> 3. M 用到的 `mCache` 属于内核线程，当 M 阻塞后相应的内存资源仍被占用，导致内存占用过高；
> 4. 由于 syscall 导致 M 的阻塞和恢复，导致了额外性能损耗。

并且亲自下场，重新设计、改进了 Go scheduler，在 Go1.1 版本中实现了 G-P-M 模型：

![gpm-nino](https://tva1.sinaimg.cn/large/006y8mN6ly1g85w9rofpbj30yg0lcgn5.jpg)

#### G-P-M 模型

那么这套模型与调度是怎样的呢？先来简单的说一下 G、P、M 的定义：

* G：表示 Goroutine，G 存储了 goroutine 执行的栈信息，状态，任务函数，可重用。
* P：Processor，表示逻辑处理器，拥有一个本地队列。对于 G 来说，P 相当于 CPU 内核，只有进入到 P 的队列中，才可以被调度。对于 M 来说，P 提供了相关的执行环境（Context），如内存分配状态，任务队列等。P 的数量就是程序可最大可并行的 G 的数量（前提：物理CPU核数 >= P的数量），由用户设置的 GOMAXPROCS 决定。
* M：Machine，是对系统线程的抽象，是真正执行计算的部分。M 在绑定 P 后会在队列中获取 G，切换到 G 的执行栈并执行 G 的函数。M 数量不定，但同时只有 P 个 M 在执行，为了防止创建过多系统线程导致系统调度出现问题，目前默认最大限制10000个。

接下来了解这套模型的基本调度，在调度过程中还有一个 [*work-stealing*](http://supertech.csail.mit.edu/papers/steal.pdf) 的算法：

* 每个 P 维护一个本地队列；
* 当一个 G 被创建后，放入当前 P 的本地队列中，如果队列已满，放入全局队列；
* 当 M 执行完一个 G 后，会在 当前 P 的队列中取出新的 G，队列为空则在全局队列中加锁获取；
* 如果全局队列也为空，则去其他的 P 的队列中偷出一半的 G，放入自己的本地队列。

Go 语言就是凭借着这套优秀的并发模型与调度，实现了内建的并发支持。

### Goroutine 调度器的深入

让我们深入的了解一下 goroutine 调度器。

#### 调度器解决了什么问题？

##### 阻塞问题

> 如果任务G陷入到阻塞的系统调用中，内核线程M将一起阻塞，于是实际的运行线程少了一个。更严重的，如果所有M都阻塞了，那些本可以运行的任务G将没有系统资源运行。

Go 在执行阻塞的系统调用时会调用 `entersyscallblock` ，然后通过 `handoffp` 解绑 M 对应的 P。如果此时 P 的本地队列中还有 G，P 会去寻找别的 M 或创建新的 M 继续执行，若本地队列为空，则进入 `pidle` 链表，等待有需要时被取出。

如果是调用的 `entersyscall`，会将 P 的状态置为 `_Psyscall`。监控线程 `sysmon` 会通过 `retake` 循环所有的 P，发现是 `_Psyscall` 状态，就会调用 `handoffp` 来释放。

##### 抢占调度

在 Go1.1 版本中，是没有抢占调度的，当前 G 只有涉及到锁操作，读写 channel 才会触发切换。若没有抢占机制，同一个 M 上的其他任务 G 有可能会长时间执行不到，甚至会被死循环锁住。

于是 Dmitry Vyukov 提出了[《Go Preemptive Scheduler Design Doc》](https://docs.google.com/document/d/1ETuA2IOmnaQ4j81AtTGT40Y4_Jr6_IDASEKg0t0dBR8/edit), 并在1.2版本中引入了初级的抢占。

监控线程 `sysmon` 会通过 `retake` 循环所有的 P，发现运行时间超出 `forcePreemptNS` 限制（10ms）的 P，就会通过 `preemptone` 发起抢占。

##### Goroutine 的负载均衡

> 内核线程M不是从全局任务队列中得到G，而是从M本地维护的G缓存中获取任务。如果某个M的G执行完了，而别的M还有很多G，这时如果G不能切换将造成CPU的浪费。

这部分的实现是在 M 的启动函数 `mstart` 中 `schedule` 的调用来实现，它会先查找本地队列，然后查找全局队列，最后是随机偷取其他 P 的一半 G，直到取到 G 或停掉 M。为了防止全局队列被“饿死”，每61次调度，会先在全局队列中查找。

#### 调度器相关源码

调度器部分的代码主要集中在 `src/runtime/runtime2.go` 与 `src/runtime/proc.go` 这两个文件中。

调度器的4个基本结构：g、m、p、schedt，都在 `runtime2.go` 中，`schedt` 可能有些陌生，它是调度器的核心结构，也是全局资源池，用来存储 G 的全局队列，空闲的 P 链表 `pidle`，空闲的 M 链表 `midle` 等等。

调度器的具体实现函数都在 `proc.go` 中，用户的所有代码都是运行在 goroutine 中，Go 在运行时会将 `main` 中的代码放入 `main goroutine` 中运行，这时还会启动监控系统 `sysmon`。

更多关于调度器的细节，例如加锁，与 GC 的交互等，需要通过进一步的阅读源码来了解。

### 结束语

看到这里，相信大家对“并发”会有全新的认识，本文旨在讲清 Go 语言的并发性，在以后的 Go 语言编程过程中，希望更倾向于并发编程。并发编程不仅结构清晰，通常来说也会更容易并行运行，使得程序运行效率提高。

### 参考文章

[《Go Concurrency Patterns》](https://talks.golang.org/2012/concurrency.slide#1)

[《Concurrency is not Parallelism》](https://talks.golang.org/2012/waza.slide#1)

[《go-under-the-hood》](https://github.com/changkun/go-under-the-hood/blob/master/book/part2runtime/ch06sched/basic.md)

[《也谈goroutine调度器》](https://tonybai.com/2017/06/23/an-intro-about-goroutine-scheduler/)

[《Goroutine浅析》](https://ninokop.github.io/2017/12/10/Goroutine%E6%B5%85%E6%9E%90/)