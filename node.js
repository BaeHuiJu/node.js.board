var http = require("http");
var express = require("express");
var oracledb = require("oracledb");
var dbConfig = require('./dbconfig.js');
oracledb.autoCommit = true;
/* 요청의 본문을 해석해주는 미들웨어, Raw, Text형식의 본문을 추가로 해석가능 */
var bodyParser = require("body-parser");
/* 동적인 html 생성모듈 */
var ejs = require("ejs");
/* 파일을 읽어들이는 내부모듈 */
var fs = require("fs");
var app = express();
var server = http.createServer(app);
app.use(express.static(__dirname));
app.use(express.json());
app.use(bodyParser.urlencoded({extended:true}));
var conn;

/* 오라클 접속 */
oracledb.getConnection(
    {
        user          : dbConfig.user,
        password      : dbConfig.password,
        connectString : dbConfig.connectString
    },
    function(err,con) {
        if(err) {
            console.log("접속이 실패했습니다.", err);
        }
        conn = con;
    });

    /* 클라이언트로부터 regist를 요청받으면 */
    app.post("/regist", function(request, response) {
        console.log(request.body);
        /* 오라클에 접속해서 insert를 실행한다. */
        var writer = request.body.writer;
        var title = request.body.title;
        var content = request.body.content;

        /* 쿼리문 실행 */
        conn.execute("insert into notice(notice_id,writer,title,content,regdate) values(seq_notice.nextval,'" + writer + "','" + title + "','" + content + "', sysdate)", function(err,result) {
            if(err) {
                console.log("등록중 에러가 발생하였습니다.",err);
                response.writeHead(500, {"ContentType" : "text/html"});
                response.end("fail");
            } else {
                console.log("result : ", result);
                response.writeHead(200, {"ContentType" : "text/html"});
                response.end("success!!");
            }
    });
});

app.get("/list", function(request,response) {
    var total = 0;

    /* 페이징 처리 */
    var currentPage = 1;
    if(request.query.currentPage != undefined) {
        currentPage = parseInt(request.query.currentPage);
    }
    var totalRecord = 0;
    conn.execute("select * from notice order by notice_id desc", function(err, result, fields) {
        /* filed는 컬럼 */
        if(err) {
            console.log("조회실패");
        }

        totalRecord = result.rows.length;
        var pageSize = 10;
        var totalPage = Math.ceil(totalRecord/pageSize);
        var blockSize = 10;
        var firstPage = currentPage-(currentPage-1)%blockSize;
        var lastPage = firstPage + blockSize - 1; 
        var num = totalRecord - (currentPage-1)*pageSize;
        //var writer = request.rows.writer;

        fs.readFile("./list.ejs","utf-8", function(error, data) {
            if(error) {
                console.log("읽기 실패");
            } 
            //console.log(writer);
            response.writeHead(200,{"Content-Type":"text/html"});
            response.end(ejs.render(data,{
                currentPage:currentPage,
                totalRecord:totalRecord,
                pageSize:pageSize,
                totalPage:totalPage,
                blockSize:blockSize,
                firstPage:firstPage,
                lastPage:lastPage,
                num : num
                //writer : writer
            }));
        });
    });
});

server.listen(3000, function() {
    console.log("웹서버 가동중");
});