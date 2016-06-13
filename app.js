var path = require('path')
var https = require('https')
var express = require('express')
var cheerio = require('cheerio')
var phantom = require('phantom')
var config = require('./config')

var app = express()

app.set('port', config.port)
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

app.use('/assets', express.static(__dirname + '/assets'));

app.get('/', function (req, res, next) {
  res.render('index')
})

app.get('/srt', function (req, res, next) {
  https.get(decodeURIComponent(req.query.url), function (ares) {
    var data = ''
    ares.on('data', function (chunk) {
      data += chunk
    })
    ares.on('end', function () {
      var srt = ''
      $ = cheerio.load(data, {
        xmlMode: true
      })
      $('p').each(function (index) {
        var $item = $(this)
        var itemHtml = $item.html().replace(/<br\/?>/g, '\r\n')
        var itemText = $('<div>' + itemHtml + '</div>').text().trim()
        var beginArr = $item.attr('begin').split(':')
        var endArr = $item.attr('end').split(':')
        var beginA, beginB, endA, endB, tmp 
        if (beginArr.length === 3) {
          tmp = beginArr[2]
          beginArr[2] = tmp.replace(/\.\d+?$/, '')
          beginArr[3] = tmp.replace(/^\d+?\./, '')
          beginB = parseInt(beginArr[3])
        } else {
          beginB = parseInt(beginArr[3] / 60 * 1000)
        }
        beginA = beginArr.slice(0, 3).join(':')
        if (endArr.length === 3) {
          tmp = endArr[2]
          endArr[2] = tmp.replace(/\.\d+?$/, '')
          endArr[3] = tmp.replace(/^\d+?\./, '')
          endB = parseInt(endArr[3])
        } else {
          endB = parseInt(endArr[3] / 60 * 1000)
        }
        endA = endArr.slice(0, 3).join(':')
        srt += index + 1 + '\r\n' + beginA + ',' + beginB + ' --> ' + endA + ',' + endB + '\r\n' + itemText + '\r\n\r\n'
      })
      res.set('Content-Disposition', 'attachment;filename=' + decodeURIComponent(req.query.filename) + '.srt')
      res.set('Content-Type', 'application/octet-stream')
      res.send(srt)
    })
  })
})

app.get('/proxy', function (req, res, next) {
  https.get(decodeURIComponent(req.query.url), function (ares) {
    var data = ''
    ares.on('data', function (chunk) {
      data += chunk
    })
    ares.on('end', function () {
      res.send(data)
    })
  })
})

app.get('/video',function(req,res,next){
  var videoUrl = decodeURIComponent(req.query.url)
  var videoTitle = decodeURIComponent(req.query.title)
  res.render("video",{url: videoUrl,title: videoTitle})
})

app.get('/course', function (req, res, next) {
  var sitepage = null;
  var phInstance = null
  phantom.create()
    .then(function (instance) {
      phInstance = instance
      return phInstance.createPage()
    })
    .then(function (page) {
      sitepage = page
      sitepage.setting('javascriptEnabled', false)
      sitepage.setting('loadImages', false)
      return sitepage.open(req.query.url)
    })
    .then(function (status) {
      return sitepage.property('content')
    })
    .then(function (content) {
      sitepage.close()
      phInstance.exit()
      res.json(eval('({' + content.replace(/[\r\n]/g, '').match(/mvaApiTargetHostname.+?\s*?,\s*?linkedinSocialShareUrlTemplate:\s*?'.+?'/)[0] + '})'))
    })
    .catch(function (error) {
      phInstance.exit()
      res.json({
        success: false,
        msg: 'Can not get the course data'
      })
    })
})

app.use(function (req, res, next) {
  var err = new Error('404 Not Found')
  err.status = 404
  next(err)
})

app.use(function (err, req, res, next) {
  res.status(err.status || 500)
  res.render('error', {
    message: err.message,
    error: {}
  })
})

module.exports = app
