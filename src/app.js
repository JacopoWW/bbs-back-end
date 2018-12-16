const express = require('express')
const path = require('path')
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
// 文章路由
const article = express.Router()
app.use('/article', article)
article.get('/', async (req, res) => {
  const datas = await db.all('SELECT * FROM articles')
  datas.forEach(it => {
    it.userInfo = {
      avatar: 'http://localhost:3001/static/avatar.png',
      name: '小南瓜'
    }
  });
    
  res.send(datas);
  console.log(datas)
})
article.get('/:id', async (req, res) => {
  const article = await db.get('SELECT articles.*, name FROM articles JOIN users ON articles.userId=users.id WHERE articles.id=? ', req.params.id)
  if (article) {
    const comments = await db.all('SELECT * FROM comments WHERE articleId=?', req.params.id)
    res.send({
      article,
      comments,
    })
  } else {
    res.send('没有找到文章')
  }
})
article.post('/', async (req, res) => {
  const {title, content} =  req.body
  console.log(req.body)
  await db.run('INSERT INTO articles (title, content, date) VALUES (?,?,?)', title, content, Date.now())
  res.send('提交成功！')
  // console.log(await db.get('SELECT * FROM articles'))
})


// 注册登录模块
const auth = express.Router()
app.use('/auth', auth)
auth.post('/register', async (req, res) => {
  console.log(req.body)
  const { username, password } = req.body
  const user = await db.get('SELECT * FROM users WHERE name=?', username)
  // console.log(user)
  if (user) {
    res.status(403).send({message: '账号已经被注册!', type: 'username'})
  } else {
    await db.run('INSERT INTO users (name, password) VALUES (?,?)', username, password)
    res.send('register success!')
  }
})
auth.post('/login', async (req, res) => {
  console.log(req.body)
  const { username, password } = req.body;
  const user = await db.get('SELECT * FROM users WHERE name=? AND password=?', username, password)
  if (user) {
    res.status(200).send({ message: 'login success!', user: user })
  } else {
    res.status(403).send({ message: '密码错误!', type: 'password'})
  }
})

// 评论模块
const comments = express.Router()
app.use('/comment', comments)
comments.post('/', async (req, res) => {
  console.log(req.body)
  const { userId, content, date, articleId } = req.body
  await db.run(`
    INSERT INTO comments (userId, content, date, articleId)
    VALUES (?,?,?,?)
`, userId, content, date, articleId)
  console.log('保存!')
  res.send('已成功发送!');
})


// 获取用户信息模块
const userInfo = express.Router()
app.use('/user', userInfo)
userInfo.get('/:userId', async (req, res, next) => {
  console.log(req.params)
  const user = await db.get('SELECT * FROM users WHERE id=?', req.params.userId)
  if (user) {
    console.log('进到这里了')
    const userArticles = await db.all('SELECT * FROM articles WHERE userId=?', req.params.userId)
    const userComments = await db.all('SELECT * FROM comments WHERE userId=?', req.params.userId)
    res.send({
      user,
      articles: userArticles,
      comments: userComments,
    })
  } else {
    res.send('找不到该用户!')
  }
})

;
(async function () {
  db = await dbPromise
  app.listen(port, () => {
    console.log(`server listening on port ${port}`)
  })
}())