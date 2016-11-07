---
title: tpshop代码审计
---
### 题记:本人web安全方面新手,因以前常用tp框架,在tp官网上看到了一个叫做tpshop的开源产品,忍不住想要找一找BUG  
**首先,这是一次失败的代码审计,找到了一个用户收藏商品的csrf漏洞,找到了一个sql注入点,却没有找到能注入的方法**  

<!--more--> 

首先说csrf的寻找过程,意外的简单......  
原本我是要去找新增评论方法的漏洞,看了一会儿,没有发现能利用的地方,正准备去其他的地方的时候,在这个方法下面发现了用户收藏的方法,代码如下:  
```
/**
* 用户收藏某一件商品
* @param type $goods_id
*/
public function collect_goods($goods_id)
{
  $goods_id = I('goods_id');
  $goodsLogic = new \Home\Logic\GoodsLogic();        
  $result = $goodsLogic->collect_goods(cookie('user_id'),$goods_id);
  exit(json_encode($result));
}
```
一眼看过去,这绝对是有问题的啊,没有任何验证.所以我简单的用jq的ajax方法测试了一个,果然成功了;  

**下面说sql注入点**
上面的成功寻找给了我信心,这个产品是有问题!  
我就去想,tp有什么方法是有问题的,由此想到了`->query()`方法,这个方法执行的sql语句是没有参数化的,所以如果在这个方法中的sql语句存在拼接参数的话,是有可能会有注入的.  
按照上面的思路,我开始搜索Home控制器下的`->query()`,果然搜索到了好几个地方,于是一一检查,可惜检查了好几个都是没有拼接参数的,直到最后一个!  
Home/UserController控制器下的`order_detail`方法,get参数'id'直接拼接在了query中.代码:
```
$sql = "SELECT action_id,log_time,status_desc,order_status FROM ((SELECT * FROM __PREFIX__order_action WHERE order_id = $id AND status_desc <>'' ORDER BY action_id) AS a) GROUP BY status_desc ORDER BY action_id";
$items = M()->fetchSql(true)->query($sql);
```
如上所见,简单粗暴,没有任何处理的拼接.简直最佳注入点啊  
可惜的是,在详细的看了语句之后,发现并没有想象的那么简单
```
SELECT action_id,log_time,status_desc,order_status FROM ((SELECT * FROM __PREFIX__order_action WHERE order_id = 
```
这之后的语句可以随意编写,但是我却找不到方法.并且在这句拼接之后,还用了'id'参数进行别的查询:
```
$invoice_no = M('DeliveryDoc')->where("order_id = $id")->getField('invoice_no',true);
```
导致语句错误  
一次失败的代码审计......看来web安全之路还有很长啊  
ps:虽然没有注入,但是代码本身没有做订单id与用户绑定的操作,所以可以通过遍历id获取信息