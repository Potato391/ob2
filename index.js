import express from 'express'
import basicAuth from 'express-basic-auth'
import http from 'node:http'
import { createBareServer } from '@tomphttp/bare-server-node'
import path from 'node:path'
import cors from 'cors'
import config from './config.js'
import fetch from 'node-fetch' // Import node-fetch for fetching external resources

const __dirname = process.cwd()
const server = http.createServer()
const app = express(server)
const bareServer = createBareServer('/2/o/')
const PORT = process.env.PORT || 8000

if (config.challenge) {
  console.log('Password protection is enabled. Usernames are: ' + Object.keys(config.users))
  console.log('Passwords are: ' + Object.values(config.users))

  app.use(
    basicAuth({
      users: config.users,
      challenge: true,
    })
  )
}

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())
app.use('/2/static', express.static(path.join(__dirname, 'static'))) // Prefix all static file serving with '/2/static'

if (config.routes !== false) {
  const routes = [
    { path: '/2/~', file: 'apps.html' },
    { path: '/2/-', file: 'games.html' },
    { path: '/2/!', file: 'settings.html' },
    { path: '/2/0', file: 'tabs.html' },
    { path: '/2/1', file: 'go.html' },
    { path: '/2/', file: 'index.html' },
  ]

  routes.forEach((route) => {
    app.get(route.path, (req, res) => {
      res.sendFile(path.join(__dirname, 'static', route.file))
    })
  })
}

if (config.local !== false) {
  app.get('/2/y/*', (req, res, next) => {
    // Prefix all '/y/' routes with '/2/'
    const baseUrl = 'https://raw.githubusercontent.com/ypxa/y/main'
    fetchData(req, res, next, baseUrl)
  })

  app.get('/2/f/*', (req, res, next) => {
    // Prefix all '/f/' routes with '/2/'
    const baseUrl = 'https://raw.githubusercontent.com/4x-a/x/fixy'
    fetchData(req, res, next, baseUrl)
  })
}

const fetchData = async (req, res, next, baseUrl) => {
  try {
    const reqTarget = `${baseUrl}/${req.params[0]}`
    const asset = await fetch(reqTarget)

    if (asset.ok) {
      const data = await asset.arrayBuffer()
      res.end(Buffer.from(data))
    } else {
      next()
    }
  } catch (error) {
    console.error('Error fetching:', error)
    next(error)
  }
}

server.on('request', (req, res) => {
  if (bareServer.shouldRoute(req)) {
    bareServer.routeRequest(req, res)
  } else {
    app(req, res)
  }
})

server.on('upgrade', (req, socket, head) => {
  if (bareServer.shouldRoute(req)) {
    bareServer.routeUpgrade(req, socket, head)
  } else {
    socket.end()
  }
})

server.on('listening', () => {
  console.log(`Running at http://localhost:${PORT}`)
})

server.listen({
  port: PORT,
})
