---
title: JWT 与 OAuth 2.0
date: 2016/9/1 21:30:18
---
**新的项目要写接口 开始研究接口规范,决定使用RESTful风格接口规范与OAuth2.0权限管理**  

在了解OAuth2.0的过程中,发现了JWT,搜索到的结果也有好多《JWT加OAuth2.0实现xxx》等文章,让我误以为JWT与OAuth2.0是一种东西,甚至于是依赖于OAuth2.0,专用于生成token的规范.细心了解之后,发现并不一样   

<!--more-->  

```
JWT（JSON Web Token）是一个非常轻巧的规范。这个规范允许我们使用JWT在用户和服务器之间传递安全可靠的信息。
```

http://laravelacademy.org/post/3640.html?utm_source=tuicool&utm_medium=referral   

```
OAuth是一个关于授权（authorization）的开放网络标准
```

http://www.ruanyifeng.com/blog/2014/05/oauth_2_0.html  

以上是两篇详细解读JWT于OAuth2.0的文章  

**以下是我的理解:**  

JWT的token是用于传递消息的,所以token是能被解密的  

OAuth2.0的token就代表着授权令牌,而消息是服务器端在与token关联的消息体上获取.因为token本身并没有蕴含消息,所以token的生成只需要hash一下并且保证不重复就ok了  