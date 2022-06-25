import { writeFile, readFileSync, promises } from 'fs'

export const getUser = async (dbPath, chat_id) => {
  let user;
  const getUserData = () => promises.readFile(`${dbPath}/users/${chat_id}.json`, 'utf-8')
    .then(data => JSON.parse(data))
    .then(data => { user = data })
  await getUserData();
  return user;
}

export const getDb = async (dbPath, password) => {
  let db;
  const getDbData = () => promises.readFile(`${dbPath}/lists/${password}.json`, 'utf-8')
  .then(data => JSON.parse(data))
  .then(data => { db = data })
  await getDbData();
  return db;
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

const action = (type, userLists, text) => {
  let trimmedText;
  let removedItem;
  if (type === 'add') {
    trimmedText = text.replace(`добавить `, '')
  }
  if (type === 'remove') {
    trimmedText = text.replace(`удалить `, '')
  }
  const resultList = { list: '', matchLetters: 0 }
  Object.keys(userLists).forEach(list => {
    let matchLetters = 0;
    list.split('').forEach(listLetter => {
      trimmedText.split(' ')[0].split('').forEach(textLetter => {
        if (textLetter === listLetter) {
          matchLetters += 1;
        }
      })
    })
    if (matchLetters > resultList.matchLetters) {
      resultList.list = list
      resultList.matchLetters = matchLetters
    }
  })
  const newTrimmedText = trimmedText.split(' ').splice(1).join(' ')
  console.log('newTrimmedText: ', newTrimmedText);
  
  if (newTrimmedText) {
    if (type === 'add' && userLists[resultList.list]) {
      userLists[resultList.list] = userLists[resultList.list].concat(newTrimmedText)
    }
    if (type === 'remove') {
      removedItem = userLists[resultList.list]
        .find(item => 
          item.includes(newTrimmedText.split()[newTrimmedText.split().length - 1]));
          userLists[resultList.list] = userLists[resultList.list]
        .filter(item => 
          !item.includes(newTrimmedText.split()[newTrimmedText.split().length - 1]))
    }
  }
  return { newDb: userLists, list: resultList.list, item: newTrimmedText, removedItem }
}

const createListString = (listName, array) => {
  let list = ``
  array.forEach((item, index) => list += (index + 1 + '. ' + item + "\n"))
  return list
}

export const showList = async (bot, chat_id, text, userLists) => {
  const listName = text[0].toUpperCase() + text.slice(1)
  if (userLists[text.toLowerCase()]) {
    const list = createListString(listName, userLists[text.toLowerCase()])
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
    await bot.sendMessage(chat_id, `Выберите действие`, options);
  } else {
    bot.sendMessage(chat_id, `Не найдено списка "${listName}". Пример создания списка: "создать список ..."`)
  }
}

export const showAllLists = (bot, chat_id, userLists) => {
  const noListsText = 'Нет активных списков. Пример сообщения для добавления списка: "добавить список фильмы".'
  try {
    const lists = [];
    Object.keys(userLists).forEach((item) => {
      lists.push([{text: item[0].toUpperCase() + item.slice(1), callback_data: item}])
    })
    const options = {
      reply_markup: JSON.stringify({
        keyboard: lists
      })
    };
    bot.sendMessage(chat_id, 'Выберите список', options);
  } catch(err) {
    bot.sendMessage(chat_id, noListsText);
  }
}

export const createNewList = async (bot, id, password, text) => {
  let db;
  const listName = text.split(' ').splice(2).join(' ').trim()
  if (listName) {
    try {
      db = await getDb(password)
      const dbWithNewList = { ...db, [listName]: [] }
      const addList = async () => {
        promises.writeFile(`../DB/bot_pulling_db/lists/${password}.json`, JSON.stringify(dbWithNewList));
      }
      await addList();
      bot.sendMessage(id, `Добавлен новый список "${listName}".`)
    } catch(err) {
      bot.sendMessage(id, `Ошибка создания списка.`)
    }
  }
}

export const deleteList = (bot, chat_id, db, dbPath, text) => {
  const listName = text.split(' ').splice(2).join(' ').trim()
  if (!Object.keys(db).includes(listName)) {
    bot.sendMessage(chat_id, `Список "${listName}" не найден.`)
    return;
  }
  const dbCopy = { ...db }
  delete dbCopy[listName]
  writeFile(dbPath, JSON.stringify(dbCopy), (error) => {
    if (error) {
      console.log('An error has occurred ', error);
      return;
    }
  });
  bot.sendMessage(chat_id, `Список "${listName}" удален.`)
}

export const addItem = async (bot, chat_id, user, userLists, dbPath, text) => {
  const { newDb, list, item } = action('add', userLists, text)
  if (item) {
    await bot.sendMessage(chat_id, `"${item}" добавлено в список ${list}`)
    writeFile(`${dbPath}/lists/${user.password}.json`, JSON.stringify(newDb), (error) => {
      if (error) {
        console.log('An error has occurred ', error);
        return;
      }
    });
  }
  showList(bot, chat_id, list, newDb)
}

export const removeItem = async (bot, chat_id, db, dbPath, text) => {
  const { newDb, list, item, removedItem } = action('remove', db, text)
  if (removedItem) {
    await bot.sendMessage(chat_id, `"${removedItem}" удалено из списка ${list}`)
    writeFile(`${dbPath}/lists/${user.password}.json`, JSON.stringify(newDb), (error) => {
      if (error) {
        console.log('An error has occurred ', error);
        return;
      }
    });
  }
  showList(bot, chat_id, list, newDb)
}