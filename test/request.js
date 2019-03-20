const expect  = require("chai").expect;
const sift = require('sift').default
const nock = require('nock');
var http = require('http');

const sendRequest = require('../includes/request.js')
let targetRequests = require('./targetRequests.js')
let routeItems = require('./routeItems.js')

describe('sendEndpoint request', function(){
  before(function(){
    this.receivedData = false
    this.httpEndPointServer = http.createServer().listen(8808);
    this.httpEndPointServer.on('request', (request, response) => {
      // the same kind of magic happens here!
      let body = [];
      request.on('error', (err) => {
        console.error(err);
      }).on('data', (chunk) => {
        body.push(chunk);
      }).on('end', () => {
        body = Buffer.concat(body).toString();
        body = JSON.parse(body)
        let code = 200
        if(body.test == "503") {
          code = 503
        }
        
        response.writeHead(code, {
          'Content-Type': 'application/json',
        });
        if(body.test == "array") {
          response.write(JSON.stringify([{
            url: 'test/1',
            id: 1
          },{
            url: 'test/2',
            id: 2
          },{
            url: 'test/3',
            id: 3
          },{
            id: 4
          },{
            url: 'http://ya.ru'
          },{
            url: 'https://ya.ru'
          },{
            some: 'unknown'
          }]))
        } else {
          response.write(JSON.stringify({
            headers: request.headers,
            body: body
          }))
        }
        response.end();
      });
    });
  })
  after(function(){
    this.httpEndPointServer.close()
  })
  afterEach(function(){
    this.receivedData = false
  })
  it('Endpoint response 200 ', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'

    sendRequest(targetRequest, routeItems, function(err, response) {
      expect(response.code).to.equal(200)
      expect(response.answer.headers.test).to.equal("test")
      expect(response.answer.body.test).to.equal("test")
      done()
    })
    
  })
  it('Endpoint response 200 array', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "array"}'

    sendRequest(targetRequest, routeItems, function(err, response) {
      expect(response.code).to.equal(200)
      expect(response.answer).to.be.an('array')
      for(let i in response.answer) {
        expect(response.answer[i]).to.have.any.keys('url', 'id', 'some')
      }
      
      done()
    })
    
  })
  it('Endpoint response 503', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "503"}'

    sendRequest(targetRequest, routeItems, function(err, response) {
      expect(response.code).to.equal(503)
      expect(response.answer.headers.test).to.equal("test")
      expect(response.answer.body.test).to.equal("503")
      done()
    })
    
  })
  /*it('Adapter transformed request', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'
    
    sendRequest(targetRequest, routeItems, function(err, response) {
      expect(response.answer.after).to.equal(true)
      done()
    })
    
  })
  it('Adapter set adapter-test header', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'
    
    sendRequest(targetRequest, routeItems, function(err, response) {
      expect(response.headers['x-adapter-after-test']).to.equal('adapter-test')
      done()
    })
    
  })
  it('Adapter received request', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'
    let self = this
    
    sendRequest(targetRequest, routeItems, function(err, response) {
      expect(self.receivedData.body.test).to.equal("test")
      done()
    })
    
  })*/
  it('No endpoint found', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'
    let routeNoRegisterItems =  sift({
      path: { $ne: 'register'},
    }, routeItems)
    let self = this
    sendRequest(targetRequest, routeNoRegisterItems, function(err, response) {
      expect(err).to.be.instanceof(Error)
      done()

    })
    
  })
  it('No endpoint available', function(done){
    let targetRequest = targetRequests[0];
    targetRequest.requestDetails._buffer = '{"test": "test"}'
    this.httpEndPointServer.close()
    let self = this
    sendRequest(targetRequest, routeItems, function(err, response) {
      expect(err).to.be.instanceof(Error)
      done()
      /*setTimeout(function(){
        expect(self.receivedData).to.equal(false)
        done()
      }, 100)*/
    })
    
  })
})
