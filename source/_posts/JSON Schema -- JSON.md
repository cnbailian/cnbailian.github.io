---
title: JSON Schema -- JSON
---

**JSON Schema 系列第一篇：了解 JSON**

<!--more-->  

## 介绍

JSON（JavaScriptObjectNotation） 是一种轻量级、基于文本、不限语言的数据交换格式，源自 ECMAScript，《[Standard ECMA-262 3rd Edition - December 1999](http://www.ecma-international.org/publications/files/ECMA-ST/Ecma-262.pdf)》的一个子集，而后成为写入 RFC 文档：[RFC 4627](https://tools.ietf.org/html/rfc4627)，最新的 RFC 标准为：[RFC 8259](https://tools.ietf.org/html/rfc8259)。

JSON 的官方 MIME 类型是 `application/json`，文件扩展名是 `.json`。

## 类型

**两种结构化类型**：

* Object：`名称/值`的集合（A collection of name/value pairs），在不同的语言中，被理解为 `object`，`record`，`struct`，`dictionary`，`hash table` 等等。
    * 使用大括号`{`，`}`包裹`名称/值`的集合，名称是字符串类型，值可以是以上任意类型。名称与值使用`:`分隔。`名称/值`之间使用`,`分隔。
    * 格式示例：`{"example":"string"}`。
* Array：值的有序列表（An ordered list of values），在大部分语言中，被理解为 `array`。
    * 使用中括号`[`，`]`包裹值的列表，值可以是以上任意类型。值与值之间使用`,``分隔。
    * 格式示例：`[0,"1",null,false,true,{},[]]`。

**四种基本类型**：

* 字符串（string）
    * 字符串是 Unicode 字符组成的集合，使用双引号包裹（`"`），反斜杠转义（`\`）。
    * 与 C 或 Java 的字符串相似。
* 数值（number）
    * 使用十进制，可以为负数或者小数。还可以用`e`或者`E`表示为指数形式。
    * 数值也与 C 或 Java 的数值相似。
* 布尔（boolean）
    * `true` 或 `false`。
* 空（null）
    * `null`。

**Tips**：

* 值的是可以嵌套的。
* 名称是字符串类型，也就是说可以是任意 Unicode 字符，但是不推荐使用英文以外的语言，虽然 JSON 允许，但是有些使用 JSON 的语言可能不支持。
* 符号中间允许空白字符。
* JSON 没有限制必须以 `object` 或结构类型作为顶层类型。
* 但是某些语言解析某种类型会更加方便，比如给 ios 最好是使用 `object` 作为顶层类型。
* 上述的集合或列表（string，object，array）可以是空集或空列。

## 示例

```
# Object
{
    "Image": {
        "Width":  800,
        "Height": 600,
        "Title":  "View from 15th Floor",
        "Thumbnail": {
            "Url":    "http://www.example.com/image/481989943",
            "Height": 125,
            "Width":  100
        },
        "Animated" : false,
        "IDs": [116, 943, 234, 38793]
    }
}

# Array
[
    {
        "precision": "zip",
        "Latitude":  37.7668,
        "Longitude": -122.3959,
        "Address":   "",
        "City":      "SAN FRANCISCO",
        "State":     "CA",
        "Zip":       "94107",
        "Country":   "US"
    },
    {
        "precision": "zip",
        "Latitude":  37.371991,
        "Longitude": -122.026020,
        "Address":   "",
        "City":      "SUNNYVALE",
        "State":     "CA",
        "Zip":       "94085",
        "Country":   "US"
    }
]

# Only values

"Hello world!"

42

true

null
```
