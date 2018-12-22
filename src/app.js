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

  const articles = [];
  await db.each(
    'SELECT articles.*, avatar, name from articles JOIN users ON articles.userId=users.id',
    (err, row) => articles.push({
      id: row.id,
      title: row.title,
      content: row.content,
      date: row.date,
      userInfo: {
        avatar: row.avatar,
        name: row.name,
      }
    }),
  )
  res.send(articles);
  console.log(articles)
})
article.get('/:id', async (req, res) => {
  const { id } = req.params
  // db.prepare(
  //   `SELECT articles.*, name FROM articles
  //   JOIN users ON articles.userId=users.id
  //   WHERE articles.id=?`, id,
  //   (err, row) => {
  //     console.log('进到这里')
  //     res.send(row);
  //   }
  // )
  const article = await db.get(`
    SELECT articles.*, name, avatar
    FROM articles JOIN users
    ON articles.userId=users.id WHERE articles.id=? `
    , id)
  if (article) {
    const comments = await db.all(`
      SELECT comments.*, name, avatar
      FROM comments JOIN users
      ON comments.userId=users.id
      WHERE comments.articleId=?`
      , Number(id)) // 必须要用Number类型不然找不到的，你可以思考一下为什么
    console.log(comments)
    res.send({
      article,
      comments,
    })
  } else {
    res.send('没有找到文章')
  }
})
article.post('/', async (req, res) => {
  const {title, content, userId } =  req.body
  console.log(req.body)
  const user = db.get('SELECT * FROM users WHERE id=?', userId)
  if (user) {
    try {
      await db.run('INSERT INTO articles (title, content, date, userId) VALUES (?,?,?,?)', title, content, Date.now(), userId)
      res.send({ message: '提交成功！' })
      // console.log(await db.get('SELECT * FROM articles'))
    } catch(e) {
      console.log(e)
      res.status(400).send({
        message: '提交失败',
        type: 'notFound',
      })
    }
  } else {
    res.status(404).send({
      message: '不存在的用户Id',
      type: 'notFound'
    })
  }
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
    // 别忘了用异步
    const userInfo = await db.get('SELECT name, id FROM users WHERE name=?', username)
    console.log(userInfo)
    res.send({
      message: '注册成功!',
      userInfo,
    })
  }
})
auth.post('/login', async (req, res) => {
  console.log(req.body)
  const { username, password } = req.body;
  const userInfo = await db.get('SELECT name, id FROM users WHERE name=? AND password=?', username, password)
  if (userInfo) {
    res.send({ message: '登录成功', userInfo })
  } else {
    res.status(403).send({ message: '密码错误!', type: 'password'})
  }
})

// 评论模块
const comments = express.Router()
app.use('/comment', comments)
comments.post('/', async (req, res) => {
  console.log(req.body)
  const { userId, content, articleId } = req.body
  await db.run(`
    INSERT INTO comments (userId, content, date, articleId)
    VALUES (?,?,?,?)
`, userId, content, Date.now(), articleId)
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