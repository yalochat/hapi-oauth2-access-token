'use strict'

const Lab = require('lab')
const Code = require('code')
const Hapi = require('hapi')
const Vcr = require('vcrecorder')
const Plugin = require('../lib')

const lab = exports.lab = Lab.script()
const describe = lab.describe
const it = lab.it
const expect = Code.expect

let server = null

lab.beforeEach(done => {
  server = new Hapi.Server()
  server.connection()
  done()
})

const validAccessToken = process.env.VALID_ACCESS_TOKEN
const invalidAccessToken = process.env.INVALID_ACCESS_TOKEN
const oauthServerHost = process.env.OAUTH_HOST
const oauthClientId = process.env.OAUTH_CLIENT_ID
const oauthClientSecret = process.env.OAUTH_CLIENT_SECRET
const applicationId = process.env.APPLICATION_ID

describe('hapi-oauth2-access-token', () => {
  it('register well, :)', done => {
    server.register({
      register: Plugin,
      options: {
        host: 'host',
        clientId: 'clientId',
        clientSecret: 'clientSecret',
        applicationId: 'applicationId'
      }
    }, err => {
      expect(err).to.not.exist()
      server.stop()
      done()
    })
  })

  it('register bad :(', done => {
    const register = Plugin.register
    Plugin.register = (server, options, next) => {
      return next(new Error('Fail Registration'))
    }

    Plugin.register.attributes = {
      name: 'fake plugin'
    }

    server.register(Plugin, err => {
      Plugin.register = register
      expect(err).to.exist()
      server.stop()
      done()
    })
  })

  it('get resource with valid token', done => {
    server.register({
      register: Plugin,
      options: {
        host: oauthServerHost,
        clientId: oauthClientId,
        clientSecret: oauthClientSecret,
        applicationId: applicationId
      }
    }, err => {
      expect(err).to.not.exist()

      server.route({
        method: 'GET',
        path: '/',
        config: {
          auth: 'bearer',
          handler: (request, reply) => {
            reply('private resource')
          }
        }
      })

      Vcr.insert('get-resource-valid-token')
      server.inject({ method: 'GET', url: '/', headers: {authorization: `Bearer ${validAccessToken}`} }, res => {
        expect(res.statusCode).to.equal(200)
        expect(res.result).to.equal('private resource')
        server.stop()

        Vcr.eject(rec => {
          done()
        })
      })
    })
  })

  it('get resource with invalid token', done => {
    server.register({
      register: Plugin,
      options: {
        host: oauthServerHost,
        clientId: oauthClientId,
        clientSecret: oauthClientSecret,
        applicationId: applicationId
      }
    }, err => {
      expect(err).to.not.exist()

      server.route({
        method: 'GET',
        path: '/',
        config: {
          auth: 'bearer',
          handler: (request, reply) => {
            reply('private resource')
          }
        }
      })

      Vcr.insert('get-resource-invalid-token')
      server.inject({ method: 'GET', url: '/', headers: {authorization: `Bearer ${invalidAccessToken}`} }, res => {
        expect(res.statusCode).to.equal(401)
        expect(res.result.message).to.equal('Invalid access token')
        server.stop()
        Vcr.eject(rec => {
          done()
        })
      })
    })
  })
})
