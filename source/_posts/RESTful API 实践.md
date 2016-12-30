---
title: RESTful API 实践
---

## 理解 REST 与 RESTful

REST 是Fielding博士在他的论文[[1]](#Fielding博士论文)中提出的一种新的架构风格,被称作表述性状态移交（Representational State Transfer）架构风格,它成为了现代 Web 架构的基础.[[2]](#HTTP)

符合 REST 原则的应用程序或设计称做 RESTful.

<!--more-->

**RESTful API 设计原则:**

1. 无状态

 - 通信必须在本质上是无状态的.无状态指的是任意一个Web请求必须完全与其他请求隔离，当客户端提出请求时，请求本身包含了这一请求所需的全部信息,会话状态因此要全部保存在客户端

 - *有状态和无状态与请求本身没有多大关联，重要的是状态信息是由请求方还是响应方负责保存*

2. 对于web的融入

 - 这个API应该能够使用浏览器来进行所有测试,能够方便的使用web功能测试、性能测试等工具进行测试,web类应用也方便将多个RESTful API进行整合应用

3. 资源

 - 对于资源的抽象，是设计RESTful API的核心内容,资源就是"Representational State Transfer"这个词组中被省略的主语

 - REST 对于信息的核心抽象是资源.任何能够被命名的信息都能够作为一个资源:一份文档或一张图片、一个与时间相关的服务（例如，“洛杉矶今日的天气”）、一个其他资源的集合、一个非虚拟的对象（例如，人）等等。

4. 缓存

 - 应当具有良好的缓存机制, HTTP的缓存机制就是个不错的选择

5. 低耦合

 - REST的几个特征保证了RESTful API的低耦合性, 对于资源（Resource）的抽象、统一接口（Uniform Interface）、超文本驱动（Hypertext Driven）[[3]](#低耦合性)

## RESTful API 实践

### 请求

RESTful 使用HTTP动词操作资源

**常用的HTTP动词有下面四个[[4]](#所有的HTTP动词)**

1. `GET` - 用于获取资源信息
2. `POST` - 用于新建或修改资源
3. `PUT` - 用于新建或修改资源
4. `DELETE` - 用于删除资源

**幂等性(Idempotent)**

幂等性是指: 多次请求所得到的结果与一次请求所得到的结果相同. 上方具有幂等性的方法有GET/PUT/DELETE

用一个点赞的示例来说明幂等性 & POST与PUT的区别:

当这个点赞一个人只能点赞一次的时候,应使用PUT方法,这个点赞是具有幂等性的,当一个人可以点赞无数次时,应使用POST方法

*PUT方法的幂等性使我们能更好的处理逻辑*

**常见操作示例**

- `GET /user` - 获取用户列表
- `GET /user/uid` - 获取指定用户
- `GET /user/uid/comments` - 获取指定用户的评论
- `POST /user` - 新建一个用户
- `PUT /user/uid` - 修改指定用户
- `DELETE /user/uid` - 删除指定用户

*URL的设计原则:资源不能使用动词、路径不宜过深,二三层即可,过深可以使用参数的方式来代表、永远使用最短的路径*

**不被支持的HTTP动词**

有些情况下会只支持GET&POST方法(HTML的FORM标签method属性),可以在头信息中加入 `X-HTTP-Method-Override` 来表示当前的HTTP请求或在请求参数中加入 `_method` 来表示当前请求(laravel框架使用的此方法)

### SSL/TLS

条件允许的情况下,永远使用SSL/TLS!

好处不多说了,再说一点: 不要将HTTP重定向到HTTPS,抛出错误就好,因为第一次的 HTTP 请求就有可能被劫持,导致请求无法到达服务器，从而构成 HTTPS 降级劫持

### 文档

文档应简单易懂并具有良好的示例,粘贴至浏览器能直接使用

这里推荐使用Postman,很好用的调试RESTful API的chrome应用

### 版本号

API不会是永远稳定的,版本升级的问题无法避免.

版本号只允许枚举,不允许区间.

关于API的版本号问题,有两种解决方案:

1. 放入URL中. 优点是更加直观些
2. 放入Header 信息中.URL更加优雅,api.github.com采用此方法

### 信息过滤

包括 筛选、排序、分页等

**筛选**

`GET /users?name=张三` - 筛选出所有 `name = 张三` 的用户

为了使接口调用者更加方便,可以将一些常见的查询参数使用别名表示:

`GET /users/vip` - 筛选出所有 `vip` 用户

*如果业务过于复杂导致普通的查询参数无法胜任,可以试着查询参数json化,虽然不标准,但是已解决问题为主*

**限制返回字段**

`?fields=id,name`

**排序**

两种解决方案,第一种是拆分为两个参数:

```
?sortby=level&order=asc
```

第二种,使用 `-` 表示倒序,使用 `,` 分隔多个排序:

```
?sort=-type,created_at
```

**分页**

常见的分页解决方案有两种,第一种是传统的 `offset` + `limit` :

```
?offset=10 - 偏移量
?limit=10 - 返回数量
```

第二种是使用游标分页,需提供 `cursor` (下一页的游标) 与 `limit` :

```
?cursor=2015-01-01 15:20:30 - 使用时间作为游标
?limit=10 - 返回数量
```

总结一下传统分页的特点:

1. 传统分页可以进行跳页
2. 会出现重复数据问题
3. 当`offset`数值较大时,效率降低明显
4. 分页不涉及排序

我认为使用游标的分页方式受众面比较小,例如想要作为游标的字段有着重复的数据,不能适应负责的排序等.多数情况下,不推荐使用

*在实践中发现 重复数据 的问题有些严重,我的解决方案是增加首次分页的时间作为查询条件,取所有小于这个时间的数据.缺点是会造成后续新增数据只有在刷新后才显示,*

### exceptional 返回时详细描述**

### HATEOAS

HATEOAS(超媒体即应用状态引擎 Hypermedia as the Engine of Application State), REST的重要原则之一

在 RESTful 中表现为: 返回结果中提供链接，连向其他API方法,比如,访问 api.github.com 

```json
{
	"current_user_url": "https://api.github.com/user",
	......
}
```

理应作为RESTful的设计原则之一,也看了在API中的用处[[5]](#HATEOAS),但是在实践中感觉用处不是很大,碰到业务逻辑比较复杂的地方用起来也很麻烦.还是视情况应用吧

### JSON格式请求

请求头的 `Content-Type` 设置为 `application/json` 告诉服务器端消息主题为 `json` 格式数据
关于优缺点不多做描述, QuQu大神 讲解的很详细了[[6]](#JSON格式输入)

### 相关资源嵌入

API在使用过程中,不可避免的要遇到需要加载相关数据的情况,比如说获取一个用户信息的同时获取这个用户相关的部门信息,这个时候让客户端再请求一次部门的接口是不友好的,也不能在用户信息里加入相关部门信息.

解决方案是在请求参数中加入 `embed` 来表示相关资源的嵌入

```
?embed=department.name,job
```

使用 `.` 表示相关字段, 使用 `,` 分割资源列表

这个请求的返回应该是:

```json
{
	"id" : 1,
	"name" : "user",
	"department" : {
		"name" : "xxx"
	},
	"job" : {
		"id" : 1,
		"name" : "xxxx"
	}
}
```

*没有使用过HTTP2.0协议,不清楚 2.0 的多路复用(Multiplexing) 会不会适用此场景*

### 限流

用户在一定时间内发出的请求次数要做出限制

具体算法可以看大神博客[[7]](#流量控制与令牌桶算法)

这里主要说的是 RESTful API 在这方面做出的处理

在 `HTTP status code` 中有 `429` 专用于返回此种错误

同时应在响应头中提示用户,命名没有一定的规范,但也要遵守基本法,不要胡乱取名,示例:

```
	X-Rate-Limit-Limit - 周期内允许请求的总数
	X-Rate-Limit-Remaining - 周期内剩余可请求次数
	X-Rate-Limit-Reset - 周期剩余时间
```

stackoverflow 上有关于这个问题的讨论[[8]](#缓存头信息返回方案)

不要使用UNIX时间戳[[9]](#为什么不要使用UNIX时间戳)

### 权限

REST的重要原则之一就是无状态,所以不应该使用 `cookie` & `session` , 而是使用 凭证 来进行权限认证.

对外的接口应使用 OAuth2.0 框架[[10]](#OAuth2.0),作为API的权限控制, 对内接口也可使用简化版的 OAuth2.0

关于 为什么 `session` 是 不符合REST原则的 而 凭证 又是符合REST原则, 这里的答案可以进行参照[[11]](#REST无状态(stateless)原则)

我的总结: 语义不同.

`sessionID` 作为一种 标识着某个会话的KEY,给服务端传递请求的语义为:请帮我取出这个信息,在这里,信息是由服务端进行存储的,所以,毫无疑问这是违反REST无状态原则的.

而凭据呢,是服务端期待着客户端传过来的用户验证身份的凭据,是由客户端进行存储的,所以是符合REST原则的

### 缓存

HTTP已经为我们提供了很好的解决方案 `ETag` & `Last-Modified`

这里有一片讲解 `ETag` 的文章, 非常详细[[12]](#Etag详解)

`Last-Modified` 基本与 `ETag` 相同,只是判断依据从 `ETag` 变为时间

### 响应

**始终返回适当的HTTP状态码**

**使用 `JSON` 作为唯一的返回格式**

正确(200 系)时返回所请求的数据即可,不要返回 `code = 0` 这样的无用信息

错误时返回具体的错误信息

```json
{
	'message': 'Invalid Token'
}
```

业务逻辑较为复杂时,返回业务逻辑错误码

```json
{
	'code' : 10010,
	'message': 'Insufficient balance'
}
```

*业务逻辑错误码应与HTTP状态码不重复*

*当你认为 `HTTP status code` 不够用时, 应该想着去使用 业务逻辑码 来解决问题,而不是自定义`HTTP status code`*

**Enveloping**

应考虑到客户端无法获取头信息的情况,这是要将头信息包含在实体中返回(例如 `JSONP`)

请求参数 `?enveloping=jsonp`

```
callback_function({
	status_code: 200,
	next_page: "https://..",
	response: {
		... 正常的 JSON 实体 ... 
	}
})
```

**创建 & 更新**

创建 & 更新的请求(POST & PUT) 应返回该资源的内容

**常用的 `HTTP status codes`**

 - `200 OK` - 请求成功,并且请求结果已返回至响应实体中

 - `201 Created` - 请求已经被实现,而且有一个新的资源已经依据请求的需要而创建,其URI会返回在头信息中

 - `202 Accepted` - 请求已被接受,但尚未处理,请求有可能会拒绝执行 (例如 异步请求)

 - `204 No Content` - 请求成功,但没有内容返回 (例如 `DELET` 请求) 

 - `304 Not Modified` - 请求的资源没有修改 适用于请求 缓存 没有变化的资源

 - `400 Bad Request` - 请求的格式不正确 客户端不应该重复该请求

 - `401 Unauthorized` - 需要客户端提供身份凭据

 - `403 Forbidden` - 客户端提供了身份凭据,但权限不足

 - `404 Not Found` - 请求的资源不存在 

 - `405 Method Not Allowed` - 不存在当前请求的HTTP动词

 - `410 Gone` - 请求的资源已废弃,并且没有对应新资源 (如果是转到了新的URL,应使用 `301 Moved Permanently`)

 - `422 Unprocessable Entity` - 通常用于请求格式正确,但是用户输入的值不符合服务端的需求 (表单验证)

 - `429 Too Many Requests` 请求的速率超过限制

**美化返回结果**

可以提供一个参数,让返回的结果是格式化后的 JSON 数据,便于使用者的调试.

*如果你是一个使用者,并且api没有提供一个这样的参数的情况下,可以使用chrome扩展(搜索 JSON VIEW 此类的关键词)或Postman 来进行调试*

### 实践出真知

在上面常见的HTTP动词中,我没有提到 `PATCH`, 是因为我在实际使用中没有碰到要划分 `PUT` 与 `PATH` 的情况,所以,觉得这个方法不是那么主要

客户端要求不能直接返回数组型的 JSON 数据, 要加上 `KEY` .有时间可以学一学,做个小APP实践一下

**当你认为你的业务不属于以上HTTP动词的范畴中时**

对业务进行深层次解读,或拆分

例如 : `search` 我的理解,  某种服务也是资源

例如 : `login` 我的理解, 对于一个 API 来说, `login` 的行为在本质上是对 `凭据` 这个资源的创建,而且是幂等的

**业务逻辑与代码逻辑冲突时,HTTP动词的选择**

跟着业务逻辑走

例如,业务的删除,在代码里的时间可能是软删除( `deleted_at =1` ),这个时候的HTTP动词一定要是 `DELETE`

### 写在最后

在我看来, RESTful 真的很好,简单直观,规范易懂,贴合web,更易于测试 等等等等, 但是 毕竟只是架构风格,过度纠结如何遵守规范反而是违背了设计API的初衷.

我在实践中也有很多不遵守的地方,也曾经纠结过很多东西,事后证明大部分不过是浪费时间罢了.

API的设计本身就是要从使用者的角度出发,如果是对外的接口,要尽量做的规范,这样能适应大多数人,对内的接口还是要多听取下使用者的意见,针对于本身的业务来进行调整.

**This**

本编文章是总结我对于REST与RESTful的理解,与实践结合而成.

<理解 REST 与 RESTful> 一章来源与我看过博士的论文(英语不好,看的中文译本)后,融合网络上的RESTful规范理解而成

<RESTful API 实践> 一章的来源: 大部分知识点源自我对于 《Best Practices for Designing a Pragmatic RESTful API》的理解,剩余部分是在网络中整理提炼出来的知识,将两者整合,应用于实践后的我的理解.

**如果你认为有些地方有问题,或者歧义比较大的话,还望指出,thanks**

*因为要整理的知识点很多,也很杂乱,所以写了一个chrome扩展来帮助自己做笔记,没有上架,还在完善中,有兴趣的同学可以去我的github上看down下来试一试*

### 参考文章

1. [Best Practices for Designing a Pragmatic RESTful API](http://www.vinaysahni.com/best-practices-for-a-pragmatic-restful-api) (本篇文章的大部分知识点来源于此,对于我理解应用RESTful有着很大的帮助)

2. [架构风格与基于网络应用软件的架构设计（中文修订版）](http://www.infoq.com/cn/minibooks/web-based-apps-archit-design?utm_source=minibooks_about_rest-deep-dive&utm_medium=link&utm_campaign=rest-deep-dive) ([Fielding](https://en.wikipedia.org/wiki/Roy_Fielding)博士的论文中文版 因为英语不太好,所以没有强行去看原版)

3. [Architectural Styles and the Design of Network-based Software Architectures](http://www.ics.uci.edu/~fielding/pubs/dissertation/top.htm) ([Fielding](https://en.wikipedia.org/wiki/Roy_Fielding)博士论文原版)

4. [理解本真的REST架构风格](http://www.infoq.com/cn/articles/understanding-restful-style/) (帮助我理解了REST概念)

5. [我所认为的RESTful API最佳实践](http://www.scienjus.com/my-restful-api-best-practices/) (找到的国内RESTful API实践中较好的一篇文章)

6. [RESTful API 设计指南](http://www.ruanyifeng.com/blog/2014/05/restful_api.html) (使我了解了RESTful API,可惜东西讲解的有些少)

7. [理解RESTful架构](http://www.ruanyifeng.com/blog/2011/09/restful.html) (RESTful基础)

8. [理解OAuth 2.0](http://www.ruanyifeng.com/blog/2014/05/oauth_2_0.html) (理解OAuth2.0, 有这篇文章就够了)

9. [对于REST中无状态(stateless)的一点认识](http://developer.51cto.com/art/200906/129424.htm) (加深了我对于 无状态 的理解)

### 注

##### Fielding博士论文

[英文原版](http://www.ics.uci.edu/~fielding/pubs/dissertation/top.htm)

[中文译版](http://www.infoq.com/cn/minibooks/web-based-apps-archit-design?utm_source=minibooks_about_rest-deep-dive&utm_medium=link&utm_campaign=rest-deep-dive)

##### HTTP

```
我们在互联网工程工作组（IETF）定义了现有的超文本移交协议（HTTP/1.0）[19]，并且为 HTTP/1.1 [42] 和 URI（统一资源标识符）[21] 的新规范设计扩展。在开展这些工作的最初阶段，我就认识到需要建立一个关于 Web 的运转方式的模型。这个关于整个 Web 应用中的交互的理想化模型，被称作表述性状态移交（REST）架构风格，它成为了现代 Web 架构的基础。

出自[中文译版] 结论
```

##### 低耦合性

[理解本真的REST架构风格](http://www.infoq.com/cn/articles/understanding-restful-style/)

REST特性讲解

##### 所有的HTTP动词

[ALL](https://tools.ietf.org/html/rfc2616#section-9)

##### HATEOAS

[在RESTFul API中使用HATEOAS的好处](http://www.infoq.com/cn/news/2009/04/hateoas-restful-api-advantages)

##### JSON格式输入

[QuQu大神博文](https://imququ.com/post/four-ways-to-post-data-in-http.html#toc-2)

##### 流量控制与令牌桶算法

[潘神- 流量控制与令牌桶算法](https://blog.jamespan.me/2015/10/19/traffic-shaping-with-token-bucket)

##### 缓存头信息返回方案

[讨论](http://stackoverflow.com/questions/16022624/examples-of-http-api-rate-limiting-http-response-headers)

##### 为什么不要使用UNIX时间戳

[为什么不要使用UNIX时间戳](http://www.vinaysahni.com/best-practices-for-a-pragmatic-restful-api#rate-limiting)

##### OAuth2.0

[大神博客 - 理解OAuth 2.0](http://www.ruanyifeng.com/blog/2014/05/oauth_2_0.html)

##### REST无状态(stateless)原则
[对于REST中无状态(stateless)的一点认识](http://developer.51cto.com/art/200906/129424.htm)

##### Etag详解

[HTTP缓存 这里主要是讲的Etag](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/http-caching?hl=zh-cn)