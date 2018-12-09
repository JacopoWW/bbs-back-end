const express = require('express')
const path = require('path')
const fs = require('fs')
const bodyParser = require('body-parser')
const sqlite = require('sqlite')
const dbPromise = sqlite.open('./bbs.db', { Promise })

let db;

const port = 3001
const app = express()

// const articleList = [{
//   id: 1,
//   title: '打工！打工！',
//   content: '独自跑到了深圳，感觉难受。在没出社会之前，总以为独自生活不就是找个工作打工，租房子，认真工作，保持学习。用不了多久就可以升职、加薪、走上人生巅峰。自己真正走上这一步后才意识到，这个看起来很简单的历程并不是那么容易走过去的。重新审视自己，内心总觉的要依靠谁，总想着日子不好过了还可以回家。',
//   date: '2018/10/12',
//   userInfo: {
//     avatar: 'http://localhost:3001/static/avatar.png',
//     nickName: '小南瓜',
//   },
// }, {
//   id: 2,
//   title: '打工！打工！',
//   content: '独自跑到了深圳，感觉难受。在没出社会之前，总以为独自生活不就是找个工作打工，租房子，认真工作，保持学习。用不了多久就可以升职、加薪、走上人生巅峰。自己真正走上这一步后才意识到，这个看起来很简单的历程并不是那么容易走过去的。重新审视自己，内心总觉的要依靠谁，总想着日子不好过了还可以回家。',
//   date: '2018/10/12',
//   userInfo: {
//     avatar: 'http://localhost:3001/static/avatar.png',
//     nickName: '小南瓜',
//   },
// }, {
//   id: 3,
//   title: '打工！打工！',
//   content: '独自跑到了深圳，感觉难受。在没出社会之前，总以为独自生活不就是找个工作打工，租房子，认真工作，保持学习。用不了多久就可以升职、加薪、走上人生巅峰。自己真正走上这一步后才意识到，这个看起来很简单的历程并不是那么容易走过去的。重新审视自己，内心总觉的要依靠谁，总想着日子不好过了还可以回家。',
//   date: '2018/10/12',
//   userInfo: {
//     avatar: 'http://localhost:3001/static/avatar.png',
//     nickName: '小南瓜',
//   },
// }]

app.use(bodyParser.json())
app.use('/static', express.static('./static'))
app.all('*', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000')
  res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type")
  res.header("Content-Type", "application/json;charset=utf-8")
  next()
})
app.use((req, res, next) => {
  console.log(req.method)
  next()
})


app.get('/article', async (req, res) => {
  console.log(req)
  res.send(articleList)
})
app.post('/article', async (req, res) => {
  console.log(req.method, req.body)
  const {title, content} =  req.body
  await db.run('INSERT INTO articles (title, content, date) VALUES (?,?,?)', title, content, Date.now())
  const articles = await db.get('SELECT * FROM articles')
  console.log(articles)
  // const data = {
  //   id: articleList.length,
  //   title,
  //   content,
  //   date: Date.now(),
  //   userInfo: {
  //     avatar: 'http://localhost:3001/static/avatar.png',
  //     nickName: '小南瓜',
  //   },
  // }
  // articleList.push(data)
  res.send('提交成功！')
})
// 注册模块
app.route('/register')
  .post(async (req, res, next) => {
    console.log(req.body)
    const user = await db.get('SELECT * FROM users WHERE name=?', req.body.username)
    console.log(user)
    if (user) {
      res.end('this username has been registered')
    } else {
      await db.run('INSERT INTO users (name, password) VALUES (?,?)', req.body.username, req.body.password)
      res.end('register success!')
    }
  })

;
(async function () {
  db = await dbPromise
  app.listen(port, () => {
    console.log(`server listening on port ${port}`)
  })
}())