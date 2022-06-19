import { writeFile, readFile } from 'fs'

const action = (type, db, text) => {
  let trimmedText;
  let removedItem;
  if (type === 'add') {
    trimmedText = text.replace(`добавить `, '')
  }
  if (type === 'remove') {
    trimmedText = text.replace(`удалить `, '')
  }
  const resultList = { list: '', matchLetters: 0 }
  Object.keys(db).forEach(dbList => {
    let matchLetters = 0;
    dbList.split('').forEach(listLetter => {
      trimmedText.split(' ')[0].split('').forEach(textLetter => {
        if (textLetter === listLetter) {
          matchLetters += 1;
        }
      })
    })
    if (matchLetters > resultList.matchLetters) {
      resultList.list = dbList
      resultList.matchLetters = matchLetters
    }
  })
  const newTrimmedText = trimmedText.split(' ').splice(1).join(' ')
  console.log('newTrimmedText: ', newTrimmedText);
  
  if (newTrimmedText) {
    if (type === 'add') {
      db[resultList.list] = db[resultList.list].concat(newTrimmedText)
    }
    if (type === 'remove') {
      removedItem = db[resultList.list]
        .find(item => 
          item.includes(newTrimmedText.split()[newTrimmedText.split().length - 1]))
      db[resultList.list] = db[resultList.list]
        .filter(item => 
          !item.includes(newTrimmedText.split()[newTrimmedText.split().length - 1]))
    }
  }
  return { newDb: db, list: resultList.list, item: newTrimmedText, removedItem }
}

export const createPassword = (message) => {
  const listName = message.text.toLowerCase().split(' ').slice(1).join().trim()
  try {
    // CREATE USER
    writeFile(
      `../DB/bot_pulling_db/users/${message.from.id}.json`, 
      JSON.stringify({ 
      name: message.from.first_name + ' ' + message.from.last_name,
      language: message.from.language_code,
      password: listName,
      last_message: message.text
    }),
    (error) => {
      if (error) {
        console.log('An error has occurred ', error);
        return;
      }
    }
  );
    // CHECK IF A DATABASE FOR THE PASSWORD EXISTS
    readFileSync(`../DB/bot_pulling_db/lists/${listName}.json`)
  } catch(err) {
    // CREATE NEW DATABASE WITH THE PASSWORD AS A NAME
    writeFile(
      `../DB/bot_pulling_db/lists/${listName}.json`, 
      JSON.stringify({}),
      (error) => {
        if (error) {
          console.log('An error has occurred ', error);
          return;
        }
      }
    )
  } 
}

const createListString = (listName, array) => {
  let list = ``
  array.forEach((item, index) => list += (index + 1 + '. ' + item + "\n"))
  return list
}

export const showList = async (bot, chat_id, text, db) => {
  const listName = text[0].toUpperCase() + text.slice(1)
  if (db[text.toLowerCase()]) {
    const list = createListString(listName, db[text.toLowerCase()])
    await bot.sendMessage(chat_id, list || `В списке "${listName}" нет записей.`)
    const options = {
      reply_markup: JSON.stringify({
        keyboard: [
          [{text: 'Добавить запись', callback_data: `Добавить запись `}],
          [{text: 'Удалить запись', callback_data: `Удалить запись `}],
          [{text: 'Списки', callback_data: `/lists`}]
        ]
      })
    };
    await bot.sendMessage(chat_id, `Выберите действие:`, options);
  } else {
    bot.sendMessage(chat_id, `Не найдено списка "${listName}". Пример создания списка: "создать список ..."`)
  }
}

export const showAllLists = (bot, chat_id, db) => {
  let userLists;
  const noListsText = 'Нет активных списков. Пример сообщения для добавления списка: "добавить список фильмы".'
  try {
    userLists = readFileSync(`../DB/bot_pulling_db/users/${chat_id}.json`)
    let lists = []
    Object.keys(db).forEach((item) => {
      lists.push([{text: item[0].toUpperCase() + item.slice(1), callback_data: item}])
    })
    const options = {
      reply_markup: JSON.stringify({
        keyboard: lists
      })
    };
    bot.sendMessage(chat_id, 'Выберите список:', options);
  } catch(err) {
    bot.sendMessage(chat_id, noListsText);
  }
}

export const createNewList = async (bot, chat_id, text) => {
  const listName = text.split(' ').splice(2).join(' ').trim()
  if (listName) {
    try {
      readFile(
        `../DB/bot_pulling_db/users/${chat_id}.json`,
        'utf8',
        async (err, data) => {
          if (err) {
            console.log(err)
          } else {
            const user = await JSON.parse(data)
            const password = await user.password
            readFile(
              `../DB/bot_pulling_db/lists/${password}.json`, 
              'utf8', 
              async (err, data) => { 
                if (err) {
                  console.log(err)
                }
                const db = await JSON.parse(data) 
                const dbWithNewList = { ...db, [listName]: [] }
                writeFile(
                  `../DB/bot_pulling_db/lists/${password}.json`, 
                  JSON.stringify(dbWithNewList), 
                  (error) => {
                    if (error) {
                      console.log('An error has occurred ', error);
                      return;
                    }
                });
                bot.sendMessage(chat_id, `Добавлен новый список "${listName}".`)
              })
          }
        })
    } catch(err) {
      console.log(err)
      bot.sendMessage(chat_id, `Ошибка создания списка.`)
    }
  }
}

export const deleteList = (bot, chat_id, db, db_path, text) => {
  const listName = text.split(' ').splice(2).join(' ').trim()
  if (!Object.keys(db).includes(listName)) {
    bot.sendMessage(chat_id, `Список "${listName}" не найден.`)
    return;
  }
  const dbCopy = { ...db }
  delete dbCopy[listName]
  writeFile(db_path, JSON.stringify(dbCopy), (error) => {
    if (error) {
      console.log('An error has occurred ', error);
      return;
    }
  });
  bot.sendMessage(chat_id, `Список "${listName}" удален.`)
}

export const addItem = async (bot, chat_id, db, db_path, text) => {
  const { newDb, list, item } = action('add', db, text)
  if (item) {
    await bot.sendMessage(chat_id, `"${item}" добавлено в список ${list}`)
    writeFile(db_path, JSON.stringify(newDb), (error) => {
      if (error) {
        console.log('An error has occurred ', error);
        return;
      }
    });
  }
  showList(bot, chat_id, list, newDb)
}

export const removeItem = async (bot, chat_id, db, db_path, text) => {
  const { newDb, list, item, removedItem } = action('remove', db, text)
  if (removedItem) {
    await bot.sendMessage(chat_id, `"${removedItem}" удалено из списка ${list}`)
    writeFile(db_path, JSON.stringify(newDb), (error) => {
      if (error) {
        console.log('An error has occurred ', error);
        return;
      }
    });
  }
  showList(bot, chat_id, list, newDb)
}