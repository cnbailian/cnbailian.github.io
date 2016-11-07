---
title: Api安全 研究
---

**继续研究接口系列的东西,这回是安全方面的防重放攻击与限流**

<!--more-->  

**首先是防止重放攻击的"签名+时间戳"方法.**  

*因为据了解apk的反编译并不难,所以我认为"签名"已经是防君子不防小人的东西了*  

签名的算法大致都是相同的:即请求参数+时间戳+token+盐等,hash加密后传  
也有的需要解密,所以不使用hash,使用对称加密的.   
```json
{
	'data' : {
		'id' : 1
	},
	'time' : 14000000000,,
	'token' : 'xxxxxxxxxx',
	'salt' : '%^$#FJfdsd^*34'
}
```
服务器端先验证时间戳超时  
后同样的算法验证一下签名是否一致,判定成功后将签名存入缓存(缓存的时间应为验证时间戳超时的时间),下次验证签名是否存在,防止重放攻击  


**再说限流,因为"DOS攻击(Denial of Service Attack)",所以限流的存在还是很有必要的,虽然一般限流都是运维的工作**  
*万一运维不会的话,就有用到的时候了*  

常用的限流算法有两种: 漏桶算法和令牌桶算法  
漏桶算法的思路很简单,水()请求)先进入到漏桶里,漏桶以一定的速度出水,当水流入速度过大会直接溢出,可以看出漏桶算法能强行限制数据的传输速率  
令牌桶的思路是: 所有的流量要放行前都要消耗一定量的token,所有的token都存放在一个bucket(桶)内,每经过一个时间周期(每1/r秒),都会在bucket中放入一个token,bucket有着最大的容量.当token存满容器并且没有消耗时,新的产出token将会被抛弃  

**上面的两种算法都是有着持久化的需求(不断放水与不断加入令牌),但是web服务是访问时才会运行,所以不适用这两种方法,经过半天的思考,我想出了一个"冲水算法"**  
**冲水就是在有需要的时候,把不需要的东西冲掉,例如,每次方便后按下冲水按钮一样,详细的过程请看代码注释!**  
```php
//用的lumen框架 php扩展的Redis
// 设置限制条件,也就是redis存储的名称 可更改为其他(用户id等)
$ip  = $_SERVER['REMOTE_ADDR'];
// total 为容器大小,即: $cycle时间内最多有x次访问
$total = 10;
// cycle 为时间周期,即: x时间内最多有$total词访问
$cycle = 10;
// 黑名单持续时间
$blackTime = 600;
// 验证黑名单
if ($redis->get('blackIp:'.$ip)){
  $ttl = $redis->ttl('blackIp:'.$ip);
  return response(['error' => "Access Denied time:".$ttl], 403);
}
// 获取容器里的内容
$bucket = $redis->lrange('ip:'.$ip,0,$total-1);
if ($bucket){
  // 通过循环判断是否过期,因为Redis的存储方式是时间戳正序存入,所以可以找到未过期的内容即为停止
  foreach ($bucket as $k => $v){
    // 判断一个时间周期内是否有内容过期
    if ((time() - $cycle*$total) < (int)$v){
      // 存下尚未过期内容,冲掉已过期内容
      $redis->ltrim('ip:'.$ip, $k, 9);
      // 将起始数定为当前key
      $start = $k;
      break;
    }
  }
  // 如果内容全部过期,则删除全部内容
  if (!isset($start)){
    app('phpRedis')->del('ip:'.$ip);
  }else{
    // 如果起始数为0,证明没有过期内容,并且容器已满,加入黑名单
    if ($start == 0 && count($bucket) == $total){
    app('phpRedis')->setex('blackIp:'.$ip, $blackTime, $ip);
    }
  }
}
// 存储访问记录
$redis->rpush('ip:'.$ip,time());
$redis->expire('ip:'.$ip,3600);
```