import axios from "axios";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const TOKEN = "8741716806:AAHM8snR6y0t7YlIQIoC9ApierS60UwE8PQ".trim();
const BASE = `https://api.telegram.org/bot${TOKEN}`;

const ADMIN_CHAT_ID = 1753989947;

let lastUpdate = 0;
let lastCpuSample = os.cpus();

const CHECK_INTERVAL_MS = 3000;
const MONITOR_INTERVAL_MS = 60000;

const CPU_ALERT_PERCENT = 85;

const alertState = {
  cpuHigh: false
};

async function send(chatId, text) {
  await axios.post(`${BASE}/sendMessage`, {
    chat_id: chatId,
    text: text
  });
}

function sampleCpu() {
  return os.cpus().map(cpu => {
    const t = cpu.times;
    return {
      idle: t.idle,
      total: t.user + t.nice + t.sys + t.idle + t.irq
    };
  });
}

function cpuUsage(prev, curr) {
  let idle = 0;
  let total = 0;

  for (let i = 0; i < prev.length; i++) {
    idle += curr[i].idle - prev[i].idle;
    total += curr[i].total - prev[i].total;
  }

  return 100 * (1 - idle / total);
}

async function serverStatus() {

  const s1 = sampleCpu();
  await new Promise(r => setTimeout(r,1000));
  const s2 = sampleCpu();

  const cpu = cpuUsage(s1,s2).toFixed(1);

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  const ram = (usedMem / totalMem * 100).toFixed(1);

  const uptime = Math.floor(os.uptime()/60);

  return `Gigzito VPS status
CPU: ${cpu}%
RAM: ${ram}%
Uptime: ${uptime} minutes`;
}

async function dockerStatus() {

  try {
    const {stdout} = await execAsync(
      'docker ps --format "table {{.Names}}\\t{{.Status}}"'
    );

    return stdout;

  } catch {

    return "Docker unavailable";
  }
}

async function pm2Status() {

  try {

    const {stdout} = await execAsync("pm2 list --no-color");

    return stdout;

  } catch {

    return "PM2 unavailable";
  }
}

async function deploy(chatId) {

  if(chatId !== ADMIN_CHAT_ID){
    await send(chatId,"Unauthorized.");
    return;
  }

  await send(chatId,"🚀 Deploy started");

  try {

    const {stdout,stderr} =
      await execAsync('bash -ic "deploy"');

    const output =
      (stdout || stderr || "Deploy finished").slice(0,3500);

    await send(chatId,`✅ Deploy complete\n\n${output}`);

  } catch(err){

    await send(chatId,`❌ Deploy failed\n${err.message}`);
  }
}

async function handle(chatId,text){

  if(text==="/ping"){
    await send(chatId,"OpenClaw is alive");
    return;
  }

  if(text==="/status"){
    await send(chatId,"Gigzito VPS online\nDocker running\nScan bots standby");
    return;
  }

  if(text==="/server"){
    await send(chatId,await serverStatus());
    return;
  }

  if(text==="/docker"){
    await send(chatId,await dockerStatus());
    return;
  }

  if(text==="/pm2"){
    await send(chatId,`PM2 status:\n${await pm2Status()}`);
    return;
  }

  if(text==="/deploy"){
    await deploy(chatId);
    return;
  }

  await send(chatId,"Unknown command. Try /ping");
}

async function checkUpdates(){

  try{

    const res = await axios.get(`${BASE}/getUpdates`,{
      params:{offset:lastUpdate+1}
    });

    const updates = res.data.result || [];

    for(const u of updates){

      lastUpdate = u.update_id;

      if(!u.message?.text) continue;

      const chatId = u.message.chat.id;
      const text = u.message.text.trim();

      console.log("CMD:",text);

      await handle(chatId,text);
    }

  }catch(err){

    console.log("Telegram error:",err.message);
  }
}

async function monitor(){

  const curr = sampleCpu();
  const cpu = cpuUsage(lastCpuSample,curr);

  lastCpuSample = curr;

  if(cpu >= CPU_ALERT_PERCENT && !alertState.cpuHigh){

    alertState.cpuHigh = true;

    await send(
      ADMIN_CHAT_ID,
      `🚨 CPU ALERT\nUsage ${cpu.toFixed(1)}%`
    );
  }

  if(cpu < CPU_ALERT_PERCENT-5 && alertState.cpuHigh){

    alertState.cpuHigh = false;

    await send(
      ADMIN_CHAT_ID,
      `✅ CPU RECOVERED\nUsage ${cpu.toFixed(1)}%`
    );
  }
}

async function start(){

  const me = await axios.get(`${BASE}/getMe`);

  console.log("Bot:",me.data.result.username);

  lastCpuSample = sampleCpu();

  checkUpdates();
  setInterval(checkUpdates,CHECK_INTERVAL_MS);

  monitor();
  setInterval(monitor,MONITOR_INTERVAL_MS);
}

start();
