var Entities = require("entities");
var FS = require('fs');
var XML2JS = require('xml2js');

var HTTP = require('http');
var HTTPS = require('https');

var Parser = module.exports = {};

var TOP_FIELDS = ['title', 'description', 'author', 'link'];
var ITEM_FIELDS = [
  'title',
  'link',
  'pubDate',
  'author',
]

var stripHtml = function(str) {
  return str.replace(/<(?:.|\n)*?>/gm, '');
}

Parser.parseString = function(xml, callback) {
  XML2JS.parseString(xml, function(err, result) {
    if (err) throw err;
    var json = {feed: {entries: []}};
    var channel = result.rss.channel[0];
    if (channel['atom:link']) json.feed.feedUrl = channel['atom:link'][0].href;
    TOP_FIELDS.forEach(function(f) {
      if (channel[f]) json.feed[f] = channel[f][0];
    })
    var items = channel.item;
    (items || []).forEach(function(item) {
      var entry = {};
      ITEM_FIELDS.forEach(function(f) {
        if (item[f]) entry[f] = item[f][0];
      })
      if (item.description) {
        entry.content = item.description[0];
        entry.contentSnippet = Entities.decode(stripHtml(entry.content));
      }
      if (item.guid) {
        entry.guid = item.guid[0]._;
      }
      if (item.category) entry.categories = item.category;
      json.feed.entries.push(entry);
    })
    callback(null, json);
  });
}

Parser.parseURL = function(url, callback) {
  var xml = '';
  var get = url.indexOf('https') === 0 ? HTTPS.get : HTTP.get;
  var req = get(url, function(res) {
    if (res.statusCode >= 300) return callback(new Error("Status code " + res.statusCode))
    res.setEncoding('utf8');
    res.on('data', function(chunk) {
      xml += chunk;
    });
    res.on('end', function() {
      return Parser.parseString(xml, callback);
    })
  })
  req.on('error', callback);
}

Parser.parseFile = function(file, callback) {
  FS.readFile(file, 'utf8', function(err, contents) {
    return Parser.parseString(contents, callback);
  })
}
