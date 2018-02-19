// system
const express = require('express')
const WebSocket_ = require("ws")
const http=require('http');
const path = require('path')
const bodyParser = require('body-parser')
const fetch_ = require("node-fetch")
const uniqid = require("uniqid")
const mongodb = require("mongodb")

// local
const atombot=require("./atombot")
const testbot=require("./testbot")
const tourney=require("./tourney")
const api=require("./api")
const GLOBALS=require("./globals")