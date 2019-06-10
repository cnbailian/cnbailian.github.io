---
title: 超媒体驱动的 Web API
date: 2017/4/20 19:18:17
---

**REST 必须是超媒体驱动的！我在以前关于 RESTful API 的博文中，对于超媒体驱动只有简单的提过，现在来探索这个问题。**

<!--more-->  

### 超媒体的重要性

超媒体这个概念的基础含义我就不再赘述了，说一说超媒体在 Web 的重要性。

> Web（万维网，英文全称 World Wide Web，简称 Web）的成功，很大程度上是因为其软件架构设计满足了拥有互联网规模（Internet-scale）的分布式超媒体系统的需求。

这是Fielding博士在论文中对于 Web 的定义，而 REST 架构风格，正是一直指导着现代 web 架构的设计与开发。这篇论文中提起的所有架构属性，都是基于 **互联网规模（Internet-scale）** 的 **分布式** **超媒体** 系统的需求来进行分析。

**超媒体是 REST 的基点之一。**

### WEB API 中的超媒体

超媒体对于 web 的重要性显而易见了，但是在 web API 中超媒体却发展的不是很理想，很多不是超媒体驱动的 web API 也自称 RESTful API，Fielding博士在2008年10月20日，发表了一篇文章：《[REST APIs must be hypertext-driven](http://roy.gbiv.com/untangled/2008/rest-apis-must-be-hypertext-driven)》，博士在文章中与下方的评论中阐述了超媒体的重要性。毫无疑问，REST 这个 buzzword 的专利是属于Fielding博士的，嗯，既然不符合标准我以前的博文还是换个 buzzword 吧，改为 HTTP API 好了。

**关于超媒体与超文本，以下是Fielding博士在评论中的回复**

> When I say hypertext, I mean the simultaneous presentation of information and controls such that the information becomes the affordance through which the user (or automaton) obtains choices and selects actions. Hypermedia is just an expansion on what text means to include temporal anchors within a media stream; most researchers have dropped the distinction.

### 超媒体的作用

论文中给出的正式的超媒体的定义：

> 超媒体（hypermedia）是由应用控制信息（application control information）来定义的，这些控制信息内嵌在信息的表达（the presentation of information）之中，或者作为信息的表达之上的一层。

**超媒体将资源互相连接起来，并以机器可读的方式来描述它们的能力**。举个例子，HTML 的 <a> 标签：

```
<a href="http://www.baidu.com/">点击我将跳转至百度</a>
```

这是一个简单的超媒体控件，它向浏览器传达了它可以发起这样的一个请求：

```
GET / HTTP/1.1
Host: www.baidu.com
```

这就是机器可读的超媒体格式，HTML 还有其他更多更复杂的超媒体控件。

> 超媒体是服务器用以和客户端进行对话的一种方式，客户端从而可以知道未来将可以向服务器发起什么样的请求。它就是一个由服务器提供的菜单，客户端可以从中自由的进行选择。服务器通常都知道可能发生哪些事，但是客户端将决定实际发生什么。其实这并不是什么新鲜的话题，我们的万维网就是以这种方式工作的，并且我们都想当然地认为它就应该是这样工作的，其他的任何方式都是一种无用的历史的倒退。但是在 API 的世界里，超媒体仍然是一个令人难以理解且富有争议的话题。这也说明了为什么如今的 API 在应对变化时还是显得如此糟糕。

以上出自《RESTful Web APIs》第四章。想一想现在的大部分 web API，是不是就是缺少超媒体，缺少机器可读的方式，只有人类可读的文档。

> 通过合理地使用超媒体，便可以解决或至少是改善现今 web API 存在的可用性和稳定性问题。

### Web API 存在的问题

* Web API 经常有大量的阅读文档来告诉你如何为不同的资管构造 URL。这违背了 REST 的连通性与自描述信息的原则。

* 要集成一个新的 API，不可避免的就要编写新的定制化软件，或者安装别人编写的代码库，哪怕这个新的 API 也叫作 RESTful API，哪怕这个新的 API 是你原来用过的同一个公司的不同产品。

* Web API 发生了变化以后，定制化的 API 客户端就不能正常使用了，需要维护者进行一些代码修复。对比来看，当网站重新设计改版，用户可能会抱怨，然后慢慢适应。在这期间，浏览器可不会停止工作。

### 解决方案

目前已经有了一些超媒体解决方案，《RESTful Web APIs》中有着详细的介绍，我还没有完全理解，先不讲出来误人子弟了。

### 困惑-Web API的发展方向

目前在我看来，有着超媒体的 web API 以后的发展方向就是：传输数据与自描述消息，但是展现形式却由客户端来定义，如果展现也是服务器给出的话，那 API 客户端也就是另一个浏览器了。可这绝对是不符合大部分 API 提供者的利益，或许这种理想化的情况只能出现在以后的人工智能中吗？

### 总结

嗯，标题党了，没有给出超媒体驱动的解决方案，只是讲了我对于超媒体以及 web API 的一些观点，确实是对于实现这里还没有完全理解，日后有所收获了再分享。
