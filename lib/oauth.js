'use strict'

const Boom = require('boom')
const Bucker = require('bucker')
const Hoek = require('hoek')
const Wreck = require('wreck')

const internals = {
  accessToken: '',
  default: {
    options: {
      grantType: 'clientCredentials',
      protocol: 'http',
      debug: false
    }
  }
}

let Logger = null

const externals = {}
/**
 * Build URL of OAuth Server to make requests
 * @return {string}     URL of OAuth Server
 */
internals.buildURLOauth = () => (`${internals.options.protocol}://${internals.options.host}`)

/**
 * Build a string with base64 format from buffer with format clientId:clientSecret
 * @param  {string} clientId     client id of application
 * @param  {string} clientSecret client secret of application
 * @return {string}              base 64 enconde string
 */
internals.buildBase64Token = (clientId, clientSecret) => (new Buffer(`${clientId}:${clientSecret}`).toString('base64'))

/**
 * Set the local access token to empty string
 */
externals.resetAccessToken = () => (internals.accessToken = '')

/**
 * Get an access token for the service
 * @param  {string}   clientToken Token send by client that consume the service
 * @param  {Function} callback
 * @return {Function} execute callback param
 */
externals.getAccessToken = (clientToken, callback) => {
  if (internals.accessToken !== '') {
    return callback(null, clientToken)
  } else {
    const uri = `${internals.buildURLOauth()}/oauth/token`
    const payload = {
      grantType: internals.options.grantType
    }
    const options = {
      timeout: 5000,
      headers: {
        'content-type': 'application/json',
        authorization: `Basic ${internals.base64Token}`
      },
      payload: JSON.stringify(payload)
    }

    Logger.info(`Getting token from ${uri} with base64Token: ${internals.base64Token}`)

    return Wreck.post(uri, options, (err, res, payload) => {
      if (err) {
        return callback(err)
      }
      const response = JSON.parse(payload)
      if (response.statusCode !== 200) {
        return callback(Boom.create(res.statusCode, response.message))
      }

      internals.accessToken = response.token

      Logger.info(`Token generate from OAuth Server: `, response)

      return callback(null, clientToken)
    })
  }
}

/**
 * Validate if token have access to this service
 * @param  {string}   clientToken Token send by client that consume the service
 * @param  {Function} callback
 * @return {Function} execute callback param
 */
externals.validateToken = (clientToken, callback) => {
  const uri = `${internals.buildURLOauth()}/apps/tokens/${clientToken}`
  const options = {
    timeout: 5000,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${internals.accessToken}`
    }
  }

  Logger.info(`Validate access token from ${uri} with  token ${internals.accessToken}`)
  Logger.info(`Send with header: authorization => Bearer ${internals.accessToken}`)

  Wreck.get(uri, options, (err, res, payload) => {
    if (err) {
      return callback(err)
    }
    const response = JSON.parse(payload)

    Logger.info('Access token from OAuth Server', response)

    if (res.statusCode !== 200) {
      if (res.statusCode === 400 && response.message === 'Client unauthorized') {
        // Its an invalid token
        return callback(null, false)
      } else if (res.statusCode === 401 && response.message === 'Token expired') {
        // If token has expired then set empty access token
        externals.resetAccessToken()
      }
      return callback(Boom.create(res.statusCode, response.message))
    }

    // Token is valid
    return callback(null, true)
  })
}

module.exports = (options) => {
  // Set configuration for instance and merge with default configuration
  internals.options = Hoek.applyToDefaults(internals.default.options, options)

  // Create logger instance with debug option
  Logger = Bucker.createLogger({ console: internals.options.debug, name: '/lib/oauth' })

  // Set token with base64 format
  internals.base64Token = internals.buildBase64Token(internals.options.clientId, internals.options.clientSecret)

  Logger.info(`Creating instance of OAuth`)

  return externals
}
