require("dotenv").config()
const Koa = require('koa')
const app = new Koa()
const router = require('koa-router')()
const koaBody = require('koa-body')
const bodyParser = require('koa-bodyparser')
const crypto = require('crypto')
const { spawn } = require('child_process')
const path = require('path')
const log4js = require('log4js')
const logger = log4js.getLogger()
logger.level = 'debug'

function sign(data) {
	return `sha1=${
		crypto.createHmac('sha1', process.env.GITHUB_SECRET).update(data).digest('hex') // process.env.GITHUB_SECRET 同 GitHub 设置的 secret 相同
	}`
}

function verify(signature, data) {
	const sig = Buffer.from(signature)
	const signed = Buffer.from(sign(data))
	if (sig.length !== signed.length) {
		return false
	}
	return crypto.timingSafeEqual(sig, signed)
}

app.use(koaBody())
app.use(bodyParser())

router.get('/hello', async function(ctx) {
	ctx.body = {
		message: 'Hello~'
	}
})

router.post('/webhooks', async function(ctx) {
	let { body: payload, headers } = ctx.request
	let signature = headers['x-hub-signature']

	if (signature !== verify(signature, payload)) {
		return res.end('Not permission!')
	}

	ctx.body = {
		ok: true
	}

	let event = headers['x-github-event']
	if (event === 'push') {
		let name = path.join(__dirname,`${payload.repository.name}.sh`)
		let child = spawn('sh', [name])
		let buffers = [] 
		child.stdout.on('data', function(buffer) {
			logger.info('启动子进程')
			buffers.push(buffer)
		})
		child.stdout.on('end', function(buffer) {
			let log = Buffer.concat(buffers)
			logger.info(log)
		})
	}
})

app.use(router.routes())

app.listen(9494, () => {
	console.log('[Server] port 9494')
})