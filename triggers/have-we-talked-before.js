const { getRandomElement } = require('../utils');
const { greetingRegex } = require('./greeting');
const { enqueueMessage } = require('../outgoing-messages');
const { DateTime } = require('luxon');

const questions = [
  "Мы общались ранее?"
];

const trigger = {
  name: "HaveWeTalkedBeforeTrigger",
  condition: (context) => {
    // if (!context?.request?.isFromUser) {
    //   return false;
    // }
    const trigger = false;
    if (context?.state?.history) {
      const history = context?.state?.history;
      if (history && history.length == 2) {
        console.log(history);

        const firstMessage = history?.[0].text;
        const secondMessage = history?.[1].text;
  
        console.log({ firstMessage, secondMessage });
  
        if (greetingRegex.test(firstMessage) && greetingRegex.test(secondMessage)) {
          trigger = true;
        }
      }
    }
    return trigger;
  },
  action: (context) => {
    enqueueMessage({
      ...context,
      response: {
        message: getRandomElement(questions)
      }
    });
  }
};

module.exports = {
  trigger,
  questions
};