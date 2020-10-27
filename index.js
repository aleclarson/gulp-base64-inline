var fs = require('fs')
var url = require('url')
var path = require('path')
var mime = require('mime')
var iconv = require('iconv-lite')
var cheerio = require('cheerio')
var PluginError = require('plugin-error')
var { Transform } = require('stream')

module.exports = base =>
  new Transform({
    objectMode: true,
    transform(file, _, done) {
      if (file.isStream())
        return done(
          new PluginError(
            'gulp-base64-inline',
            'Stream content is not supported'
          )
        )

      if (!file.isBuffer()) {
        return done(null, file)
      }

      var $ = parseHtml(file.contents)

      $('img').each((i, el) => {
        el = $(el)

        var src = el.attr('src')
        if (!isLocal(src)) {
          return
        }

        var imagePath =
          base && src[0] == '/' ? base + src : path.resolve(file.dirname, src)

        try {
          var imageData = fs.readFileSync(imagePath)
        } catch (e) {
          return done(
            new PluginError(
              'gulp-base64-inline',
              'Referenced file not found: ' + imagePath
            )
          )
        }

        el.attr(
          'src',
          'data:' +
            mime.lookup(imagePath) +
            ';base64,' +
            imageData.toString('base64')
        )
      })

      file.contents = iconv.encode($.html(), 'utf-8')
      done(null, file)
    },
  })

function isLocal(href) {
  return href && !url.parse(href).hostname
}

function parseHtml(html) {
  var decodedHtml = iconv.decode(html, 'utf-8')

  if (~decodedHtml.indexOf('�')) {
    decodedHtml = iconv.decode(html, 'gbk')
    decodedHtml = iconv.encode(decodedHtml, 'utf-8')
  }

  return cheerio.load(decodedHtml, {
    decodeEntities: false,
    xmlMode: false,
    lowerCaseAttributeNames: false,
  })
}
