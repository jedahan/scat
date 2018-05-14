const constants = require('./constants')
const sort = require('./sort')

let me
let client
let messages = []
let privateRecipients = []
let notifications = []
let currentMode = constants.MODE.PUBLIC
const authors = {}

/* client */
const getClient = () => client
const setClient = (c) => { client = c }

/* me */
const getMe = () => me
const setMe = (m) => { me = m }

/* author */
const getAuthor = (author) => (authors[author] || {}).name || author
const getAuthors = () => authors
const getAuthorId = (name) => Object.keys(authors).find(author =>
  authors[author].name === name || authors[author].name === `@${name}`) || name
const setAuthor = (author, name, setter) => {
  let cleanName = name
  if (cleanName[0] !== '@') {
    cleanName = `@${cleanName}`
  }
  const alreadySet = authors[author]
  // if we already have this author set
  // and it was already set by the author itself
  // and we are trying to set it ourselves
  // make that happen
  if (alreadySet && alreadySet.setter === author && author !== setter) {
    authors[author] = { name: cleanName, setter }
    return
  }
  // if any of that wasn't true, go ahead and set it
  authors[author] = { name: cleanName, setter }
}

/* mode */
const getMode = () => currentMode
const isPrivateMode = () => currentMode === constants.MODE.PRIVATE
const setPrivateMode = () => { currentMode = constants.MODE.PRIVATE }
const setPublicMode = () => {
  currentMode = constants.MODE.PUBLIC
  privateRecipients = []
}

/* message */
const pushMessage = (msg) => {
  messages.push(msg)
  // since private messages are processed async
  // we need to re-sort the messages array after receiving one
  if (msg.private) {
    sort(messages)

    // also if this wasn't sent by us
    if (msg.recipients && msg.rawAuthor !== me) {
      // first take me off the recipients list
      const notificationRecipients = msg.recipients.filter(r => r !== me)
      // and then put the author in there
      notificationRecipients.push(msg.rawAuthor)

      const talkingToThem = notificationRecipients.length === privateRecipients.length && notificationRecipients.every(privateRecipients.includes)

      // and we aren't in private mode
      // or we are in private mode but with other people
      if (!isPrivateMode() || !talkingToThem) {
        const alreadyNotified = notifications.some(
          n => n.rawRecipients.length === notificationRecipients.length && n.rawRecipients.every(r => notificationRecipients.includes(r))
        )

        // and we haven't already notified about this user sending us something
        if (!alreadyNotified) {
          notifications.push({
            recipients: notificationRecipients.map(getAuthor),
            rawRecipients: notificationRecipients
          })
        }
      }
    }
  }
}
const getMessages = () => {
  if (isPrivateMode()) {
    // if in private mode, only show messages that are either from
    // the person/people i am in private mode with
    // OR from me that i sent to people i'm in private mode with
    // unfortunately because of how private messages work
    // this means i have to put the recipients list in the private scat message
    // will make note of this in the readme
    return messages.filter(msg => {
      const fromMe = msg.rawAuthor === me
      const inPrivateRecipients = privateRecipients.includes(msg.rawAuthor)
      const sentToYou = msg.recipients && msg.recipients.some(recipient => privateRecipients.includes(recipient))
      return msg.private && (inPrivateRecipients || (fromMe && sentToYou))
    })
  }
  return messages.filter(msg => !msg.private)
}

/* recipients */
const getPrivateRecipients = () => privateRecipients
const setPrivateRecipients = (recipients) => {
  privateRecipients = recipients
  setPrivateMode()
  clearNotification(recipients)
}
const getPrivateRecipientNames = () => privateRecipients.map(getAuthor)

/* notifications */
const getNotifications = () => notifications
const getLastNotification = () => notifications[notifications.length - 1] || {}
const clearNotification = (recipients) => {
  notifications = notifications.filter((notification) => (
    !(notification.rawRecipients.length === recipients.length && notification.rawRecipients.every(r => recipients.includes(r)))
  ))
}

module.exports = {
  getClient,
  setClient,
  getMe,
  setMe,
  getAuthor,
  getAuthors,
  getAuthorId,
  setAuthor,
  getMode,
  isPrivateMode,
  setPrivateMode,
  setPublicMode,
  pushMessage,
  getMessages,
  getPrivateRecipients,
  getPrivateRecipientNames,
  setPrivateRecipients,
  getNotifications,
  getLastNotification,
  clearNotification
}
