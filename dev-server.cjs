// Dependency-free local preview. Accepts Sites' host/port flags as well.
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const args=process.argv.slice(2);
const port=Number(args[args.indexOf('--port')+1])||3000;
const host=args.includes('--host')?args[args.indexOf('--host')+1]:'127.0.0.1';
const page=path.join(__dirname,'index.html');
http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(!['/','/index.html'].includes(url.pathname)){res.writeHead(404);res.end('Not found');return;}
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
  fs.createReadStream(page).pipe(res);
}).listen(port,host,()=>console.log(`Local: http://${host}:${port}`));
