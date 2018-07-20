---
title: JSON Schema -- 介绍
---

**JSON Schema 系列第二篇：介绍 JSON Schema**

<!--more-->  

## 版本

当前版本：[draft-07](http://json-schema.org/specification.html)。

## 介绍

JSON Schema 是一个用于**注释**和**验证** JSON documents 的词汇表。

JSON Schema 本身也是基于 JSON 格式，并且提供了一系列的规范，用于描述 JSON 数据的结构，旨在定义 JSON 数据的验证，文档，超链接导航和交互控制。

## 用途

* 对数据结构进行描述
* 构建人机可读的文档
* 校验数据

## 项目状态

共有三个规范：

* [JSON Schema (core)](https://datatracker.ietf.org/doc/draft-handrews-json-schema/)
* [JSON Schema Validation](https://datatracker.ietf.org/doc/draft-handrews-json-schema-validation/)
* [JSON Hyper-Schema](https://datatracker.ietf.org/doc/draft-handrews-json-schema-hyperschema/)

项目组正在努力使它们成为正式的 RFC 标准。

*[draft-08](https://github.com/json-schema-org/json-schema-spec/milestone/6)*

## 如何应用

可以用于生成模拟数据，确保接近真实数据。

用于校验数据，实现自动化测试。

多端共用同一份验证。
