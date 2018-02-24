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
const atombot = require("./discordbot/atombot")
const testbot = require("./discordbot/testbot")
const tourney = require("./discordbot/tourney")
const api = require("./discordbot/api")
const GLOBALS = require("./discordbot/globals")
const voteserver = require("./voteserver/index")