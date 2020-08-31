const { URL } = require('url');
const _ = require('lodash');
const UserModel = require('./../models/user.model');
const { getOrGenImg, makeNapChartImageUrl } = require('./../imageCache');
const config = require('../../config.json');
const { findMember } = require('./find');
const { cutAt } = require('./utility');

module.exports = {
  processGet: function (command, message, args, dry = false) {
    if (command === 'get') {
      console.log('GET', args);
      get(args, message, dry);
      return true;
    }
    return false;
  },
};

const timeCut = [
  { v: 86400000, k: 'day' },
  { v: 3600000, k: 'hour' },
  { v: 60000, k: 'minute' },
];

function diffTimeCut(d1, d2 = new Date()) {
  let i = 0;
  let delta = d2 - d1;
  let res;
  while (i < timeCut.length && !(res = Math.floor(delta / timeCut[i].v))) {
    i++;
  }
  let resUnit = timeCut[Math.min(i, timeCut.length - 1)].k;
  if (res > 1) {
    resUnit += 's';
  }
  return `${res} ${resUnit}`;
}

async function sendNapchart(message, res, member, dry) {
  console.log(res);
  if (res && res.currentScheduleChart !== undefined) {
    const d = new Date(res.updatedAt);
    const n = d.toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const delta = diffTimeCut(d);
    if (!dry) {
      let emb = await getOrGenImg(res.currentScheduleChart, message, dry);
      emb.setColor(member.displayColor);
      emb.setAuthor(member.user.tag, member.avatarURL);
      emb.setDescription(
        `Napchart for **${member}** (since ${n}) (${delta}):
 ${emb.url}`
      );
      emb.setTimestamp();
      if (res.currentScheduleName !== undefined) {
        emb.addField('Schedule', res.currentScheduleName);
      }
      message.channel.send({ embed: emb });
    }
  } else {
    let msg = `There is no napchart available for **${member.displayName}**`;
    console.log('MSG   : ', msg);
    if (!dry) {
      message.channel.send(msg);
    }
  }
}

async function get(args, message, dry) {
  try {
    const memberIdentifier = message.content
      .slice(config.prefix.length + 3, message.content.length)
      .trim();
    console.log('INFO:  memberIdentifier: ', memberIdentifier);
    let member;
    if (memberIdentifier === '') {
      member = message.member;
    } else {
      member = findMember(
        memberIdentifier,
        message.guild,
        message.mentions.users
      );
    }
    const userDB = await UserModel.findOne({ id: member.user.id });
    sendNapchart(message, userDB, member, dry);
  } catch (e) {
    console.log(e);
    if (!dry) {
      message.channel.send(e.toString());
    }
  }
}
