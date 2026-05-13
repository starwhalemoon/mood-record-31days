const STORAGE_KEY = "moodReview31Days";
const DAY_COUNT = 31;

const symptoms = ["心慌", "困倦", "头痛", "手抖", "胃口变化", "嗜睡", "失眠", "其他"];
const events = ["工作压力", "关系冲突", "饮酒", "咖啡", "经期", "熬夜", "运动", "好消息", "其他"];
const medicationOptions = ["按时", "漏服", "调整", "未服", "不确定"];

const moodLabels = {
  "-5": "很低落",
  "-4": "明显低落",
  "-3": "偏低落",
  "-2": "有些低沉",
  "-1": "轻微低落",
  "0": "平稳",
  "1": "稍微好一点",
  "2": "还不错",
  "3": "比较有力量",
  "4": "明显兴奋",
  "5": "非常亢奋"
};

const energyLabels = {
  "0": "几乎动不了",
  "1": "很疲惫",
  "2": "有点费力",
  "3": "基本够用",
  "4": "精力偏高",
  "5": "像停不下来"
};

const anxietyLabels = {
  "0": "不明显",
  "1": "轻微",
  "2": "有一点",
  "3": "明显",
  "4": "很强",
  "5": "几乎压不住"
};

const scaleLabels = {
  mood: moodLabels,
  energy: energyLabels,
  anxiety: anxietyLabels
};

const moodColors = {
  low: "#6e8798",
  calm: "#74a38f",
  warm: "#c8a94f",
  bright: "#d99a2b"
};

let recordsEl;
let template;
let statusText;
let summaryText;
let concernText;
let worryText;
let questionText;
let changeText;
let suggestionText;
let moodChart;
let insightList;

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value) {
  if (!value) return "未填日期";
  return value.replaceAll("-", "/");
}

function getDefaultRecords() {
  const today = new Date();
  return Array.from({ length: DAY_COUNT }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (DAY_COUNT - 1 - index));

    return {
      date: formatDate(date),
      sleepHours: "",
      sleepQuality: "",
      mood: "",
      energy: "",
      anxiety: "",
      medication: "",
      symptoms: [],
      events: [],
      note: ""
    };
  });
}

function normalizeRecords(records) {
  const defaults = getDefaultRecords();
  if (!Array.isArray(records)) return defaults;

  return defaults.map((defaultRecord, index) => ({
    ...defaultRecord,
    ...(records[index] || {}),
    symptoms: Array.isArray(records[index]?.symptoms) ? records[index].symptoms : [],
    events: Array.isArray(records[index]?.events) ? records[index].events : []
  }));
}

function setStatus(message) {
  statusText.textContent = message;
  window.clearTimeout(setStatus.timer);
  setStatus.timer = window.setTimeout(() => {
    statusText.textContent = "";
  }, 3200);
}

function moodColor(value) {
  const number = Number(value);
  if (number <= -3) return moodColors.low;
  if (number <= 0) return moodColors.calm;
  if (number <= 3) return moodColors.warm;
  return moodColors.bright;
}

function scaleColor(name, value) {
  const number = Number(value);
  if (name === "mood") return moodColor(value);
  if (name === "energy") {
    if (number <= 1) return moodColors.low;
    if (number <= 3) return moodColors.calm;
    if (number === 4) return moodColors.warm;
    return moodColors.bright;
  }
  if (name === "anxiety") {
    if (number <= 2) return moodColors.calm;
    if (number === 3) return moodColors.warm;
    return moodColors.bright;
  }
  return moodColors.calm;
}

function formatScaleNumber(name, value) {
  if (name === "mood" && Number(value) > 0) return `+${value}`;
  return value;
}

function createCheckbox(name, value, selectedValues) {
  const label = document.createElement("label");
  label.className = "chip";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.name = name;
  input.value = value;
  input.checked = selectedValues.includes(value);

  label.append(input, value);
  return label;
}

function updateScaleReadout(range) {
  const card = range.closest(".day-card");
  const name = range.name;
  const value = range.value;
  const field = range.closest(".slider-field");
  const valueEl = field.querySelector(".range-value");
  const wordEl = field.querySelector(".scale-word");
  const color = scaleColor(name, value);

  valueEl.textContent = formatScaleNumber(name, value);
  wordEl.textContent = scaleLabels[name][value];
  field.style.setProperty("--scale-color", color);
  if (name === "mood") card.style.setProperty("--scale-color", color);
}

function updateDayBrief(card) {
  const date = card.querySelector('[name="date"]').value || "未填日期";
  const sleepValue = card.querySelector('[name="sleepHours"]').value;
  const sleep = sleepValue ? `${sleepValue} 小时` : "未填";
  const moodRange = card.querySelector('[name="mood"]');
  const mood = moodRange.dataset.touched === "true"
    ? `${moodRange.value > 0 ? "+" : ""}${moodRange.value} ${moodLabels[moodRange.value]}`
    : "未填";
  const note = card.querySelector('[name="note"]').value.trim();
  const shortNote = note ? `记录：${note.slice(0, 24)}${note.length > 24 ? "..." : ""}` : "一句话记录未填";

  card.querySelector(".day-brief").textContent = `${date} · 情绪 ${mood} · 睡眠 ${sleep} · ${shortNote}`;
}

function renderRecords(records) {
  recordsEl.innerHTML = "";

  records.forEach((record, index) => {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector(".day-card");
    const summaryButton = card.querySelector(".day-summary");
    const body = card.querySelector(".day-body");
    const shouldOpen = index === DAY_COUNT - 1;

    card.dataset.index = index;
    card.querySelector(".day-title").textContent = `第 ${index + 1} 天`;
    summaryButton.setAttribute("aria-expanded", String(shouldOpen));
    body.hidden = !shouldOpen;

    Object.entries(record).forEach(([key, value]) => {
      if (Array.isArray(value)) return;
      const field = card.querySelector(`[name="${key}"]`);
      if (field && field.type !== "range") field.value = value;
    });

    card.querySelectorAll('input[type="range"]').forEach((range) => {
      const savedValue = record[range.name];
      range.value = savedValue === "" || savedValue === undefined ? "0" : savedValue;
      range.dataset.touched = savedValue === "" || savedValue === undefined ? "false" : "true";
      updateScaleReadout(range);
    });

    symptoms.forEach((item) => {
      card.querySelector(".symptoms").appendChild(createCheckbox("symptoms", item, record.symptoms));
    });
    events.forEach((item) => {
      card.querySelector(".events").appendChild(createCheckbox("events", item, record.events));
    });

    summaryButton.addEventListener("click", () => {
      const isOpen = summaryButton.getAttribute("aria-expanded") === "true";
      summaryButton.setAttribute("aria-expanded", String(!isOpen));
      body.hidden = isOpen;
    });

    card.addEventListener("pointerdown", (event) => {
      if (event.target.type !== "range") return;
      event.target.dataset.touched = "true";
      updateScaleReadout(event.target);
      updateDayBrief(card);
      refreshLiveViews();
      autoSaveRecords();
    });

    card.addEventListener("input", (event) => {
      if (event.target.type === "range") {
        event.target.dataset.touched = "true";
        updateScaleReadout(event.target);
      }
      updateDayBrief(card);
      refreshLiveViews();
      autoSaveRecords();
    });

    card.addEventListener("change", () => {
      updateDayBrief(card);
      refreshLiveViews();
      autoSaveRecords();
    });

    recordsEl.appendChild(fragment);
    updateDayBrief(card);
  });

  refreshLiveViews();
}

function collectRecords() {
  return [...recordsEl.querySelectorAll(".day-card")].map((card) => {
    const getRangeValue = (name) => {
      const range = card.querySelector(`[name="${name}"]`);
      return range.dataset.touched === "true" ? range.value : "";
    };

    return {
      date: card.querySelector('[name="date"]').value,
      sleepHours: card.querySelector('[name="sleepHours"]').value,
      sleepQuality: card.querySelector('[name="sleepQuality"]').value,
      mood: getRangeValue("mood"),
      energy: getRangeValue("energy"),
      anxiety: getRangeValue("anxiety"),
      medication: card.querySelector('[name="medication"]').value,
      symptoms: [...card.querySelectorAll('[name="symptoms"]:checked')].map((input) => input.value),
      events: [...card.querySelectorAll('[name="events"]:checked')].map((input) => input.value),
      note: card.querySelector('[name="note"]').value.trim()
    };
  });
}

function collectCommunication() {
  return {
    summary: summaryText.value,
    concern: concernText.value,
    worry: worryText.value,
    question: questionText.value,
    change: changeText.value,
    suggestion: suggestionText.value
  };
}

function saveRecords(showStatus = true) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      records: collectRecords(),
      communication: collectCommunication()
    }));
    setStatus("已保存在本机浏览器。谢谢你又为自己留下了一点线索。");
  } catch {
    setStatus("这次没有成功保存到本机浏览器，但页面内容仍可继续填写。");
  }
}

function autoSaveRecords() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      records: collectRecords(),
      communication: collectCommunication()
    }));
  } catch {
    // Keep the page usable even if this browser blocks localStorage.
  }
}

function loadStoredData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { records: getDefaultRecords(), communication: {} };

    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) {
      return { records: normalizeRecords(parsed), communication: {} };
    }
    return {
      records: normalizeRecords(parsed.records),
      communication: parsed.communication || {}
    };
  } catch {
    return { records: getDefaultRecords(), communication: {} };
  }
}

function loadCommunication(communication) {
  summaryText.value = communication.summary || "";
  concernText.value = communication.concern || "";
  worryText.value = communication.worry || "";
  questionText.value = communication.question || "";
  changeText.value = communication.change || "";
  suggestionText.value = communication.suggestion || "";
}

function average(values) {
  const numbers = values.map(Number).filter((value) => !Number.isNaN(value));
  if (!numbers.length) return null;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function countItems(records, key) {
  return records.reduce((counts, record) => {
    record[key].forEach((item) => {
      counts[item] = (counts[item] || 0) + 1;
    });
    return counts;
  }, {});
}

function describeCounts(counts, minCount = 1) {
  const items = Object.entries(counts)
    .filter(([, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${name}${count}次`);
  return items.length ? items.join("、") : "暂未记录明显项目";
}

function hasConsecutive(records, test, days = 3) {
  let streak = 0;
  return records.some((record) => {
    streak = test(record) ? streak + 1 : 0;
    return streak >= days;
  });
}

function hasMultipleInSevenDays(records, test, threshold = 2) {
  return records.some((_, index) => {
    const windowRecords = records.slice(index, index + 7);
    return windowRecords.filter(test).length >= threshold;
  });
}

function isFilled(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function isRecordEffective(record) {
  return [
    record.sleepHours,
    record.sleepQuality,
    record.mood,
    record.energy,
    record.anxiety,
    record.medication,
    record.note
  ].some(isFilled) || record.symptoms.length > 0 || record.events.length > 0;
}

function getTriggeredInsights(records) {
  const insights = [];
  const eventCounts = countItems(records, "events");
  const repeatedEvents = ["工作压力", "关系冲突", "熬夜", "饮酒", "咖啡", "经期"];

  if (hasConsecutive(records, (record) => isFilled(record.sleepHours) && Number(record.sleepHours) < 4)) {
    insights.push({
      priority: 1,
      text: "这个月有几天睡眠时长连续偏少，可以重点关注一下睡眠变化：睡了多久、白天是否困、精力有没有明显变高或变低。如果之后就诊或复诊，这会是很重要的线索。"
    });
  }

  if (hasConsecutive(records, (record) => isFilled(record.mood) && Number(record.mood) <= -4)) {
    insights.push({
      priority: 2,
      text: "这个月有几天情绪指数持续偏低。可以留意一下：低落持续了几天？是否影响吃饭、睡眠、出门、工作，或者照顾自己的力气。最近可以对自己多照顾一些。如果之后就诊或复诊时，也可以把这段变化具体告诉医生。"
    });
  }

  const highMoodEnergy = hasConsecutive(records, (record) => isFilled(record.mood) && Number(record.mood) >= 4, 2)
    || hasConsecutive(records, (record) => isFilled(record.energy) && Number(record.energy) >= 4, 2)
    || records.some((record) => isFilled(record.sleepHours) && Number(record.sleepHours) < 5 && isFilled(record.energy) && Number(record.energy) >= 4)
    || records.some((record) => isFilled(record.sleepHours) && Number(record.sleepHours) < 5 && isFilled(record.mood) && Number(record.mood) >= 3);
  if (highMoodEnergy) {
    insights.push({
      priority: 3,
      text: "有几天出现了睡眠偏少、精力偏高或情绪偏高同时存在的情况。可以回想一下：那几天是否有脑子停不下来、想法变多、话变多、想立刻做很多事，或更容易冲动的感觉。这不代表判断，只是就诊或者关注自己时值得说明的线索。"
    });
  }

  const highAnxietyDays = records.filter((record) => isFilled(record.anxiety) && Number(record.anxiety) >= 4).length;
  if (hasConsecutive(records, (record) => isFilled(record.anxiety) && Number(record.anxiety) >= 4) || highAnxietyDays >= 5) {
    insights.push({
      priority: 4,
      text: "记录里有几天焦虑程度比较高。可以留意一下：焦虑通常在什么时候出现，身体有没有心慌、胸闷、手抖、胃口变化，或者坐立不安。如果这些感受影响到睡眠、出门或日常生活，既可以在日常多关注，也可以在之后就诊时说明。"
    });
  }

  if (records.some((record) => ["漏服", "未服", "调整", "不确定"].includes(record.medication))) {
    insights.push({
      priority: 5,
      text: "本月记录中出现过用药变化，例如漏服、未服、调整或不确定。可以把具体日期、原因和身体感受简单记下来。如果你正在服药，下次就诊或复诊时，可以将这些信息告诉医生，这会帮助医生更了解这段时间的状态变化。"
    });
  }

  if (repeatedEvents.some((event) => (eventCounts[event] || 0) >= 3)) {
    insights.push({
      priority: 6,
      text: "本月有一些事件反复出现，比如工作压力、关系冲突、熬夜、饮酒、咖啡或经期变化。可以看看它们是否常常和睡眠、情绪、焦虑或精力变化出现在同一天。\n\n如果这些事件让你感到不舒服或者被影响，不要急着责怪自己。这里的记录只是帮助你更清楚地看见：哪些事情可能会影响自己的状态。你已经在试着照顾自己了，也可以从这里开始，对自己再温柔一点。"
    });
  }

  return insights.sort((a, b) => a.priority - b.priority).map((insight) => insight.text);
}

function getInsights(records) {
  const triggeredInsights = getTriggeredInsights(records).slice(0, 3);
  if (triggeredInsights.length) return triggeredInsights;

  const effectiveCount = records.filter(isRecordEffective).length;
  if (effectiveCount >= 15) {
    return [
      "本月还没有看到特别集中的连续变化。你已经记录下这个月的情绪、睡眠、精力、用药和重要事件，这些都会成为你更了解自己、也更照顾自己的线索。\n\n可以继续这样慢慢记录。如果之后就诊或复诊，它们也能帮助你更清楚地说明这段时间的状态。"
    ];
  }

  return [
    "本月记录还不多，暂时看不出明显趋势。可以先从情绪、睡眠时长和一句话记录开始。慢慢留下这一个月的变化，它们就会成为你了解自己、也方便就诊沟通的线索。"
  ];
}

function refreshInsights(records) {
  insightList.innerHTML = "";
  getInsights(records).forEach((text) => {
    const item = document.createElement("li");
    item.textContent = text;
    insightList.appendChild(item);
  });
}

function refreshChart(records) {
  const width = 900;
  const height = 300;
  const padding = { top: 20, right: 26, bottom: 34, left: 44 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const xStep = chartWidth / (DAY_COUNT - 1);
  const yFor = (value) => padding.top + ((5 - value) / 10) * chartHeight;
  const xFor = (index) => padding.left + index * xStep;
  const points = records
    .map((record, index) => record.mood === "" ? null : { x: xFor(index), y: yFor(Number(record.mood)), value: Number(record.mood), index })
    .filter(Boolean);
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

  moodChart.setAttribute("viewBox", `0 0 ${width} ${height}`);
  moodChart.innerHTML = "";

  for (let value = 5; value >= -5; value -= 1) {
    const y = yFor(value);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", padding.left);
    line.setAttribute("x2", width - padding.right);
    line.setAttribute("y1", y);
    line.setAttribute("y2", y);
    line.setAttribute("stroke", value === 0 ? "#8c98a7" : "#d9e0e7");
    line.setAttribute("stroke-width", value === 0 ? "2" : "1");
    moodChart.appendChild(line);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", 12);
    label.setAttribute("y", y + 4);
    label.setAttribute("fill", "#667887");
    label.setAttribute("font-size", "12");
    label.textContent = value > 0 ? `+${value}` : value;
    moodChart.appendChild(label);
  }

  for (let index = 0; index < DAY_COUNT; index += 1) {
    const x = xFor(index);
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", x);
    label.setAttribute("y", height - 10);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("fill", "#667887");
    label.setAttribute("font-size", "11");
    label.textContent = index + 1;
    moodChart.appendChild(label);
  }

  if (path) {
    const linePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    linePath.setAttribute("d", path);
    linePath.setAttribute("fill", "none");
    linePath.setAttribute("stroke", "#4d7d86");
    linePath.setAttribute("stroke-width", "3");
    linePath.setAttribute("stroke-linecap", "round");
    linePath.setAttribute("stroke-linejoin", "round");
    moodChart.appendChild(linePath);
  }

  records.forEach((record, index) => {
    if (record.mood === "") return;

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", xFor(index));
    circle.setAttribute("cy", yFor(Number(record.mood)));
    circle.setAttribute("r", "5");
    circle.setAttribute("fill", moodColor(record.mood));
    circle.setAttribute("stroke", "#fffdf6");
    circle.setAttribute("stroke-width", "2");
    moodChart.appendChild(circle);
  });
}

function refreshLiveViews() {
  const records = collectRecords();
  refreshChart(records);
  refreshInsights(records);
}

function formatDates(records, test) {
  return records.filter(test).map((record) => record.date || "未填日期");
}

function formatMoodForSummary(value) {
  if (!isFilled(value)) return "";
  return `情绪 ${Number(value) > 0 ? "+" : ""}${value}`;
}

function generateCommunicationPage() {
  const records = collectRecords();
  const filledSleep = records.filter((record) => isFilled(record.sleepHours));
  const avgSleep = average(filledSleep.map((record) => record.sleepHours));
  const badSleepDays = records.filter((record) => record.sleepQuality === "差").length;
  const shortSleepStreak = hasConsecutive(records, (record) => isFilled(record.sleepHours) && Number(record.sleepHours) < 4);
  const moodRecords = records.filter((record) => isFilled(record.mood));
  const moodValues = moodRecords.map((record) => Number(record.mood));
  const minMood = moodValues.length ? Math.min(...moodValues) : null;
  const maxMood = moodValues.length ? Math.max(...moodValues) : null;
  const highAnxietyDates = formatDates(records, (record) => isFilled(record.anxiety) && Number(record.anxiety) >= 4);
  const lowEnergyDates = formatDates(records, (record) => isFilled(record.energy) && Number(record.energy) <= 1);
  const highEnergyDates = formatDates(records, (record) => isFilled(record.energy) && Number(record.energy) >= 4);
  const medicationCounts = medicationOptions.reduce((counts, option) => {
    counts[option] = records.filter((record) => record.medication === option).length;
    return counts;
  }, {});
  const eventText = describeCounts(countItems(records, "events"), 2);
  const notes = records
    .map((record, index) => ({ ...record, dayIndex: index + 1 }))
    .filter((record) => record.note)
    .map((record) => {
      const details = [
        `第 ${record.dayIndex} 天`,
        formatDisplayDate(record.date),
        formatMoodForSummary(record.mood),
        isFilled(record.sleepHours) ? `睡眠 ${record.sleepHours} 小时` : ""
      ].filter(Boolean).join("｜");
      return `${details}：${record.note}`;
    });
  const insights = getInsights(records).join("\n");

  const sleepSummary = filledSleep.length
    ? `本月已记录 ${filledSleep.length} 天睡眠，平均睡眠约 ${avgSleep.toFixed(1)} 小时，睡眠质量为“差”的有 ${badSleepDays} 天。${shortSleepStreak ? "记录里出现过连续睡眠较少的情况，之后就诊或复诊时可以具体说明那几天的状态。" : "目前没有看到连续 3 天睡眠少于 4 小时的记录。"}`
    : "本月暂未填写睡眠时长，复诊前可以补充几天代表性的睡眠情况。";

  const moodSummary = moodRecords.length
    ? `本月已记录 ${moodRecords.length} 天情绪指数，最低为 ${minMood}，最高为 ${maxMood}。高分和低分都只是沟通线索，不用于诊断；就诊沟通时可以结合当时睡眠、精力和行为变化一起说明。`
    : "本月暂未填写情绪指数。";

  const anxietyEnergySummary = [
    highAnxietyDates.length ? `焦虑程度较高的日期有：${highAnxietyDates.join("、")}。` : "暂未看到焦虑程度达到 4 或 5 的记录。",
    lowEnergyDates.length ? `精力明显偏低的日期有：${lowEnergyDates.join("、")}。` : "暂未看到精力明显偏低的记录。",
    highEnergyDates.length ? `精力明显偏高的日期有：${highEnergyDates.join("、")}。` : "暂未看到精力明显偏高的记录。"
  ].join("");

  const medicationSummary = `用药记录中，按时 ${medicationCounts["按时"]} 天，漏服 ${medicationCounts["漏服"]} 天，未服 ${medicationCounts["未服"]} 天，调整 ${medicationCounts["调整"]} 天，不确定 ${medicationCounts["不确定"]} 天。这里不提供用药建议，只帮助复诊时把具体日期和感受说清楚。`;

  summaryText.value = [
    "31天情绪和状态总结",
    "",
    "1. 本月睡眠情况",
    sleepSummary,
    "",
    "2. 本月情绪波动",
    moodSummary,
    "",
    "3. 焦虑和精力变化",
    anxietyEnergySummary,
    "",
    "4. 用药情况",
    medicationSummary,
    "",
    "5. 明显特殊事件",
    `本月出现频率较高的特殊事件：${eventText}。这些内容不说明因果关系，只适合作为复诊沟通线索。`,
    "",
    "6. 本月重要记录",
    notes.length ? notes.join("\n") : "本月暂时没有填写一句话记录。"
  ].join("\n");

  concernText.value = notes.length
    ? `这段时间最困扰我的事情可能和这些记录有关：${notes.slice(0, 5).join("；")}`
    : "";
  worryText.value = "";
  questionText.value = "";
  changeText.value = [
    moodRecords.length ? `情绪指数范围：${minMood} 到 ${maxMood}。` : "",
    filledSleep.length ? `平均睡眠约 ${avgSleep.toFixed(1)} 小时。` : "",
    highAnxietyDates.length ? `有 ${highAnxietyDates.length} 天焦虑程度较高。` : "",
    eventText !== "暂未记录明显项目" ? `高频事件：${eventText}。` : ""
  ].filter(Boolean).join("\n");
  suggestionText.value = [
    insights,
    "也可以补充说明：睡眠变化是否影响白天状态，情绪高低波动是否影响吃饭、出门、工作或关系，用药变化前后身体感受是否有明显不同。"
  ].join("\n");

  saveRecords();
  setStatus("医生沟通页已生成，你可以继续修改再复制或打印。");
}

function clearRecords() {
  const first = window.confirm("确定要清空所有31天记录吗？此操作只会清空本浏览器中的记录。");
  if (!first) return;
  const second = window.confirm("请再次确认：清空后无法从本工具内恢复。仍然要清空吗？");
  if (!second) return;

  localStorage.removeItem(STORAGE_KEY);
  summaryText.value = "";
  concernText.value = "";
  worryText.value = "";
  questionText.value = "";
  changeText.value = "";
  suggestionText.value = "";
  renderRecords(getDefaultRecords());
  setStatus("记录已清空。");
}

function getCopyText() {
  return [
    summaryText.value.trim(),
    concernText.value.trim() ? `\n7. 这段时间最困扰我的事情\n${concernText.value.trim()}` : "",
    worryText.value.trim() ? `\n8. 我最担心的问题\n${worryText.value.trim()}` : "",
    questionText.value.trim() ? `\n9. 我想问医生\n${questionText.value.trim()}` : "",
    changeText.value.trim() ? `\n10. 最近最明显的变化\n${changeText.value.trim()}` : "",
    suggestionText.value.trim() ? `\n11. 如果就诊，建议向医生说明的问题\n${suggestionText.value.trim()}` : ""
  ].filter(Boolean).join("\n");
}

async function copySummary() {
  const text = getCopyText();
  if (!text.trim()) {
    setStatus("请先生成医生沟通页，或填写想复制的内容。");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    setStatus("医生沟通页内容已复制。");
  } catch {
    summaryText.value = text;
    summaryText.select();
    document.execCommand("copy");
    setStatus("医生沟通页内容已复制。");
  }
}

function initApp() {
  recordsEl = document.querySelector("#records");
  template = document.querySelector("#dayTemplate");
  statusText = document.querySelector("#statusText");
  summaryText = document.querySelector("#summaryText");
  concernText = document.querySelector("#concernText");
  worryText = document.querySelector("#worryText");
  questionText = document.querySelector("#questionText");
  changeText = document.querySelector("#changeText");
  suggestionText = document.querySelector("#suggestionText");
  moodChart = document.querySelector("#moodChart");
  insightList = document.querySelector("#insightList");

  if (!recordsEl || !template || !moodChart || !insightList) return;

  document.querySelector("#saveBtn").addEventListener("click", saveRecords);
  document.querySelector("#clearBtn").addEventListener("click", clearRecords);
  document.querySelector("#summaryBtn").addEventListener("click", generateCommunicationPage);
  document.querySelector("#copyBtn").addEventListener("click", copySummary);
  document.querySelector("#printBtn").addEventListener("click", () => window.print());

  const storedData = loadStoredData();
  renderRecords(storedData.records);
  loadCommunication(storedData.communication);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
