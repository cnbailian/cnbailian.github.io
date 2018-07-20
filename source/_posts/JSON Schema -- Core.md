---
title: JSON Schema -- Core
---

**JSON Schema 系列第三篇：Core 规范**

<!--more-->  

## 简介

[JSON Schema (core)](https://datatracker.ietf.org/doc/draft-handrews-json-schema/)

此规范主要是定义了核心术语、机制，包括引用其他 JSON Schema，以及正在使用的词汇表。

## 状态

草案目前于2018年03月19日最后更新，到期时间2018年09月12日，ietf地址：[https://datatracker.ietf.org/doc/draft-handrews-json-schema/](https://datatracker.ietf.org/doc/draft-handrews-json-schema/)。

## 概述

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

## 定义

**JSON Document**

`JSON 文档(JSON document)` 是使用 `application/json` 媒体类型描述的资源。

简言之就是 JSON 值。

*JSON Schema 中， `JSON 值(JSON value)`、`JSON 文本(JSON text)`、`JSON 文档(JSON document)`是等义词。*

*JSON Schema 也是 `JSON 文档(JSON document)`。*

**Instance**

`实例(Instance)` 是使用 JSON Schema 描述的 `JSON 文档(JSON document)`。

**JSON Schema document**

使用 `application/schema+json` 媒体类型描述的 `JSON 文档(JSON document)`，简称 schema。

## 关键字

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
