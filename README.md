# hapi-oauth2-access-token

This is a plugin for Hapijs server used to integrate OAuth2 Server.


## Usage

- Run the command `npm install hapi-oauth2-access-token` use the flag `--save` to add your `package.json` file.
- Register plugin :sunglasses:

```javascript
var HapiOAuth2AccessToken = require('hapi-oauth2-access-token')

server.register({
  register: HapiOAuth2AccessToken,
  options: {
    host: 'your-host',
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
    protocol: 'http' // optional, default is http
  }
}
```

- Set auth to your routes:

```javascript
server.route({
  method: 'GET',
  path: '/',
  config: {
    auth: 'bearer',
    handler:  (request, reply) => {
      reply('private resource')
    }
  }
})
```

- Enjoy the magic :tada:

---

Create with :heart: by [Yalo](https://github.com/yalochat)
