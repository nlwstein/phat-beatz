var jsonServer = require('json-server')
var fs = require('fs')
var configRaw = fs.readFileSync('config.json')
var config = JSON.parse(configRaw)
var app = jsonServer.create()
var router = jsonServer.router('db.json')
var middlewares = jsonServer.defaults()
app.use(middlewares)
app.use('/api', router)
var bodyParser = require('body-parser')
app.use(bodyParser.json())
var FB = require('fb')
var fb = new FB.Facebook({version: "v2.7", appId: config.facebook.id, appSecret: config.facebook.secret})
app.post('/fb/updateToken/', (req, res) => {
	var accessToken = req.body.accessToken
	console.log(accessToken)
	FB.api('oauth/access_token', {
	    client_id: config.facebook.id,
	    client_secret: config.facebook.secret,
	    grant_type: 'fb_exchange_token',
	    fb_exchange_token: accessToken
	}, function (fbApiResponse) {
	    if(!fbApiResponse || fbApiResponse.error) {
	        console.log(!res ? 'error occurred' : fbApiResponse.error);
	        return;
	    }
	    var extendedAccessToken = fbApiResponse.access_token;
	    var expires = fbApiResponse.expires ? fbApiResponse.expires : 0;
	    console.log("Expires: " + expires)
	    fs.writeFileSync('.fb_token', extendedAccessToken)
	    res.send("success")
	})
})
app.listen(config.port, function () {
  console.log('JSON Server is running')
})
