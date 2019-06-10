---
title: JSON Schema
---

**JSON Schema 详解：未完待续**

<!--more-->  

## 第一篇：了解 JSON

#### 介绍

JSON（JavaScriptObjectNotation） 是一种轻量级、基于文本、不限语言的数据交换格式，源自 ECMAScript，《[Standard ECMA-262 3rd Edition - December 1999](http://www.ecma-international.org/publications/files/ECMA-ST/Ecma-262.pdf)》的一个子集，而后成为写入 RFC 文档：[RFC 4627](https://tools.ietf.org/html/rfc4627)，最新的 RFC 标准为：[RFC 8259](https://tools.ietf.org/html/rfc8259)。

JSON 的官方 MIME 类型是 `application/json`，文件扩展名是 `.json`。

#### 类型

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

#### 示例

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

## 第二篇：介绍

#### 版本

当前版本：[draft-07](http://json-schema.org/specification.html)。

#### 简介

JSON Schema 是一个用于**注释**和**验证** JSON documents 的词汇表。

JSON Schema 本身也是基于 JSON 格式，并且提供了一系列的规范，用于描述 JSON 数据的结构，旨在定义 JSON 数据的验证，文档，超链接导航和交互控制。

#### 用途

* 对数据结构进行描述
* 构建人机可读的文档
* 校验数据

#### 项目状态

共有三个规范：

* [JSON Schema (core)](https://datatracker.ietf.org/doc/draft-handrews-json-schema/)
* [JSON Schema Validation](https://datatracker.ietf.org/doc/draft-handrews-json-schema-validation/)
* [JSON Hyper-Schema](https://datatracker.ietf.org/doc/draft-handrews-json-schema-hyperschema/)

项目组正在努力使它们成为正式的 RFC 标准。

*[draft-08](https://github.com/json-schema-org/json-schema-spec/milestone/6)*

#### 如何应用

可以用于生成模拟数据，确保接近真实数据。

用于校验数据，实现自动化测试。

多端共用同一份验证。

## 第三篇：Core 规范

#### 简介

[JSON Schema (core)](https://datatracker.ietf.org/doc/draft-handrews-json-schema/)

此规范主要是定义了核心术语、机制，包括引用其他 JSON Schema，以及正在使用的词汇表。

#### 状态

草案目前于2018年03月19日最后更新，到期时间2018年09月20日，ietf地址：[https://datatracker.ietf.org/doc/draft-handrews-json-schema/](https://datatracker.ietf.org/doc/draft-handrews-json-schema/)。

#### 概述

**媒体类型**

JSON 的媒体类型：[application/json](https://tools.ietf.org/html/rfc8259#section-1.2) 。

JSON Schema 的媒体类型为 `application/schema+json`，它还有另外一种可选媒体类型用于提供额外的扩展功能：`application/schema-instance+json`。

**验证**

JSON Schema 描述了 `JSON 文档(JSON document)` 的结构，例如属性、长度限制等，程序可以以此判断 `实例(Instance)` 是否符合规范。

规范与关键字在 [JSON Schema Validation](https://datatracker.ietf.org/doc/draft-handrews-json-schema-validation/) 中定义。

**注释**

JSON Schema 可以对 `实例(Instance)` 添加注释。

规范与关键字在 [JSON Schema Validation](https://datatracker.ietf.org/doc/draft-handrews-json-schema-validation/) 中定义。

**超媒体与链接**

JSON Hyper-Schema 描述了  `JSON 文档(JSON document)` 的超文本结构，包括 `实例(Instance)` 中的资源链接关系等。

规范与关键字在 [JSON Hyper-Schema](https://datatracker.ietf.org/doc/draft-handrews-json-schema-hyperschema/) 中定义。

#### 定义

**JSON Document**

`JSON 文档(JSON document)` 是使用 `application/json` 媒体类型描述的资源。

简言之就是 JSON 值。

*JSON Schema 中， `JSON 值(JSON value)`、`JSON 文本(JSON text)`、`JSON 文档(JSON document)`是等义词。*

*JSON Schema 也是 `JSON 文档(JSON document)`。*

**Instance**

`实例(Instance)` 是使用 JSON Schema 描述的 `JSON 文档(JSON document)`。

**JSON Schema document**

使用 `application/schema+json` 媒体类型描述的 `JSON 文档(JSON document)`，简称 schema。

#### 关键字

**$schema**

`$schema` 关键字用于声明当前 `JSON 文档(JSON document)` 是 `JSON Schema document`。

值可以是 JSON Schema 版本的标识符，也是资源的位置，但必须是 [URI](https://tools.ietf.org/html/rfc3986)。

**$id**

`$id` 关键字用于定义 schema 基本的 URI，可用于 `$ref` 的引用标识，值必须是 [URI](https://tools.ietf.org/html/rfc3986)。

**$ref**

`$ref` 关键字用于定义引用 schema，值必须是 [URI](https://tools.ietf.org/html/rfc3986)。

URI 只是标识符，不是网络定位器。如果 URI 是可以访问的 URL，不应该去下载。

如果有两个 schema 互相使用 `$ref` 进行引用，不应该陷入无限循环。

**$comment**

`$comment` 用于 schema 开发人员对文档进行注释，不需要展示给最终用户看。