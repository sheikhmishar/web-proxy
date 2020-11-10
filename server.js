const express = require('express')
const debug = require('debug')
const chalk = require('chalk')
const http = require('http')
const { createProxyMiddleware } = require('http-proxy-middleware')

const proxyDebug = debug('proxyApp')
const proxyMiddlewareDebug = debug('proxyMiddleware')
const proxyApp = express()
const proxyServer = http.createServer(proxyApp)

proxyApp.disable('x-powered-by')

/** @param {Object<string, object>} obj */
const indentedJson = obj => JSON.stringify(obj, null, 4)

/** @type {import('express').ErrorRequestHandler} */
const proxyOnError = (err, req, res) => {
  proxyDebug('ERR', chalk.red(indentedJson(err)))
  proxyDebug('REQ', chalk.green(indentedJson(req.headers)))
  res.status(500).json({ message: '500 Server Error' })
}

const proxyLogProvider = _ => ({
  log: proxyMiddlewareDebug,
  debug: proxyMiddlewareDebug,
  info: proxyMiddlewareDebug,
  warn: proxyMiddlewareDebug,
  error: proxyMiddlewareDebug
})

// @ts-ignore // TODO: connection: keep-alive
const proxyMiddleware = createProxyMiddleware({
  target: 'http://127.0.0.1:5000',
  preserveHeaderKeyCase: true,
  followRedirects: false,
  changeOrigin: true,
  xfwd: true,
  ws: true,
  logLevel: 'debug',
  onError: proxyOnError,
  logProvider: proxyLogProvider,
})
proxyApp.use(proxyMiddleware)

proxyServer
  .listen(80, '127.0.0.1')
  .on('listening', () => proxyDebug('Server', proxyServer.address()))
  // @ts-ignore
  .on('error', ({ code }) => {
    if (code === 'EADDRINUSE') {
      proxyDebug(`Port ${proxyServer.address()} in use. Retry with another one`)
      proxyServer.close()
    }
  })
