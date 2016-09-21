'use strict'

const Async = require('async')
const Bucker = require('bucker')
const Boom = require('boom')
const HapiAuthBearerToken = require('hapi-auth-bearer-token')
const Joi = require('joi')
const OAuth = require('./oauth')

const internals = {
  rules: {
    options: Joi.object({
      host: Joi.string().required(),
      clientId: Joi.string().required(),
      clientSecret: Joi.string().required(),
      applicationId: Joi.string().required(),
      protocol: Joi.string(),
      grantType: Joi.string()
    })
  }
}

const Logger = Bucker.createLogger({ name: '/lib/index' })

internals.validateToken = (oauthClient, token, callback, request, retriesLeft) => {
  Logger.info(`Validating token ${token}`)
  Async.doUntil(
    (done) => {
      return Async.waterfall([
        // Get access token from API
        Async.apply(oauthClient.getAccessToken, token),
        // Validate client token
        oauthClient.validateToken
      ], (err, isValid) => {
        // isValid if response from OAuth of validating client token

        if (err) {
          // Retry again, if our token has expired
          if (err.statusCode === 401 && err.message === 'Token expired') {
            retriesLeft--
            return done(null, Boom.unauthorized(err.message))
          } else {
            return done(err)
          }
        } else {
          retriesLeft = 0
          // it isValid then the resource is available for client or false otherwise
          return done(null, isValid)
        }
      })
    },
    // Keep trying until running out of retries
    () => !retriesLeft,
    (err, res) => {
      if (res instanceof Error) {
        err = res
      }

      if (err) {
        return callback(err)
      } else {
        return callback(null, Boolean(res), { token })
      }
    }
  )
}

/**
 * Registers the  plugin
 * @param  {object}   server  hapijs server
 * @param  {object}   options options for plugin
 * @param  {Function} next
 */
exports.register = (server, options, next) => {
  try {
    Joi.assert(options, internals.rules.options, 'Invalid options for hapi-oauth2-access-token')

    server.register(HapiAuthBearerToken, err => {
      if (err) {
        return next(err)
      }

      const oauthClient = OAuth(options)
      server.auth.strategy('bearer', 'bearer-access-token', {
        allowQueryToken: true,
        accessTokenName: 'access_token',
        validateFunc: function (token, callback) {
          const retriesLeft = 3 // Retry 3 times if token has expired
          const request = this
          internals.validateToken(oauthClient, token, callback, request, retriesLeft)
        }
      })
    })

    next()
  } catch (e) {
    next(e)
  }
}

/**
 * Gets the name and version from package.json
 * @type {Object}
 */
exports.register.attributes = {
  pkg: require('../package.json')
}
