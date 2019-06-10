---
title: RESTful缓存方案
date: 2016/9/10 19:18:17
---

**RESTful的缓存是使用了http缓存规范**  
参考文章:https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/http-caching?hl=zh-cn 

<!--more-->  

**http的缓存有两种方案`ETag`与` Last-Modified` 本文讲的是第一种,也就是参考文章里所讲的**  

`ETag`缓存方案的实现很简单,服务器返回响应头的时,加上缓存时间与验证令牌(ETag),如有需要还可以加上内容类型、长度等
```
200 OK
Cache-Controller: max-age=60
ETag: "xxxxxxxxxxxxx"
Content-Lenght: 1024
```
上面的示例代码中,服务器告诉了客户端,可以缓存60秒,验证令牌为:xxxxxxxxxxxxx,内容长度是1024  

客户端在收到响应头时,可在本地缓存一个60秒的内容,60秒后,重新访问资源,并在请求头中附带`If-None-Match`值为前文收到的验证令牌.  
服务器根据客户端提供的验证令牌,判断资源是否有更新,如果没有更新,则返回`304`+空的内容,响应头中附带新的可缓存时间,如果资源有更新,则返回`200`+资源内容,响应头中附带缓存时间与新的验证令牌  
```
资源无更新示例:
304 Not Modified
Cache-Controller: max-age=60

资源有更新示例:
200 OK
Cache-Controller: max-age=60
ETag: "ooooooooooooo"
Content-Lenght: 1024
```

更详细的缓存方案也是半懂不懂,有时间应该买本《HTTP权威指南》.