import { copy, wedding } from './content.js';

const $ = selector => document.querySelector(selector);
const root = document.documentElement;
const cover = $('#cover');
const invitation = $('#invitation');
const seal = $('#seal');
const openingVideo = document.querySelector('#opening-video');
let openingTimeout;

const langButton = $('#language');
const soundButton = $('#sound');
const zaffaButton = $('#zaffa');
const form = $('form');
const submit = form.querySelector('button[type=submit]');
const status = $('#rsvp-status');
const guestInput = form.elements.guests;
const audio = $('#wedding-audio');
audio.preload = 'none';
let lang = sessionStorage.getItem('invitation-language') === 'en' ? 'en' : 'ar';
let replyState = '';
let muted = false;
let opening = false;
let zaffaStarted = false;
let rsvpReady = false;
let requestId = sessionStorage.getItem('invitation-rsvp-id') || crypto.randomUUID();
sessionStorage.setItem('invitation-rsvp-id', requestId);

const map = $('#map');
const directions = $('#directions');
if (wedding.venueMapUrl && wedding.venueEmbedUrl) {
  directions.href = wedding.venueMapUrl;
  const frame = document.createElement('iframe');
  frame.src = wedding.venueEmbedUrl;
  frame.title = copy[lang].map;
  frame.loading = 'lazy';
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  map.replaceChildren(frame);
} else {
  directions.hidden = true;
  map.hidden = true;
}

function updateAudio() {
  soundButton.hidden = !(wedding.openingAudio || (wedding.zaffaAudio && cover.hidden));
  soundButton.textContent = muted || audio.paused ? copy[lang].unmute : copy[lang].mute;
  soundButton.setAttribute('aria-pressed', String(muted));
  zaffaButton.hidden = !wedding.zaffaAudio || zaffaStarted;
}

function translate() {
  root.lang = lang;
  root.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.title = copy[lang].title;
  $('#invitation-title').lang = lang;
  $('#invitation-title').dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-monogram]').forEach(image => {
    image.src = '/assets/monogram-' + lang + '.svg';
  });
  const poster = '/assets/envelope-poster-' + lang + '.jpg';
  $('.envelope-poster').src = poster;
  openingVideo.poster = poster;
  const source = '/assets/envelope-opening-' + lang + '.webm';
  if (openingVideo.querySelector('source').getAttribute('src') !== source && !opening) {
    openingVideo.querySelector('source').src = source;
    openingVideo.load();
  }
  document.querySelectorAll('[data-copy]').forEach(node => {
    node.textContent = copy[lang][node.dataset.copy] || '';
  });
  document.querySelectorAll('[data-alt]').forEach(node => {
    node.alt = copy[lang][node.dataset.alt];
  });
  document.querySelectorAll('[data-placeholder]').forEach(node => {
    node.placeholder = copy[lang][node.dataset.placeholder] || '';
  });
  if ($('#map iframe')) $('#map iframe').title = copy[lang].map;
  langButton.textContent = lang === 'ar' ? 'EN' : 'عربي';
  langButton.lang = lang === 'ar' ? 'en' : 'ar';
  langButton.setAttribute('aria-label', lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية');
  root.querySelector('meta[name=description]').content = copy[lang].title + ' · ' + copy[lang].date + ' · ' + copy[lang].hall;
  status.textContent = copy[lang][replyState] || '';
  updateAudio();
}

langButton.addEventListener('click', () => {
  lang = lang === 'ar' ? 'en' : 'ar';
  sessionStorage.setItem('invitation-language', lang);
  translate();
});

function playAudio(url) {
  audio.pause();
  audio.src = url;
  audio.muted = muted;
  return audio.play();
}

soundButton.addEventListener('click', () => {
  if (cover.hidden && !zaffaStarted) {
    muted = false;
    startZaffa();
    return;
  }
  muted = !muted;
  audio.muted = muted;
  updateAudio();
});

async function startZaffa() {
  if (!wedding.zaffaAudio || zaffaStarted) return;
  audio.loop = true;
  try {
    await playAudio(wedding.zaffaAudio);
    zaffaStarted = true;
  } catch {
    zaffaStarted = false;
  }
  updateAudio();
}
zaffaButton.addEventListener('click', startZaffa);

if (wedding.adultPhoto) {
  const photo = $('.hero-photo img');
  photo.src = wedding.adultPhoto;
  photo.dataset.alt = 'adultAlt';
  copy.ar.adultAlt = 'محمد ونهى';
  copy.en.adultAlt = 'Mohamed and Noha';
  $('.hero-photo').classList.add('adult-photo');
}

function finishOpening() {
  window.clearTimeout(openingTimeout);
  openingVideo.pause();
  if (wedding.openingAudio) audio.pause();
  if (wedding.zaffaAudio && !zaffaStarted) startZaffa();
  cover.hidden = true;
  invitation.hidden = false;
  updateAudio();
  $('#invitation-title').focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
}

openingVideo.addEventListener('playing', () => cover.classList.add('is-playing'));
openingVideo.addEventListener('ended', finishOpening);

seal.addEventListener('click', () => {
  if (opening) return;
  opening = true;
  seal.setAttribute('aria-disabled', 'true');
  cover.classList.add('is-opening');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    finishOpening();
    return;
  }
  openingTimeout = window.setTimeout(finishOpening, 11000);
  if (wedding.openingAudio) playAudio(wedding.openingAudio).catch(() => {});
  openingVideo.playbackRate = 1.3;
  openingVideo.play().catch(finishOpening);
});


$('#replay').addEventListener('click', () => {
  audio.pause();
  zaffaStarted = false;
  updateAudio();
  invitation.hidden = true;
  cover.hidden = false;
  cover.classList.remove('is-opening', 'is-playing');
  if (openingVideo.readyState > 0) openingVideo.currentTime = 0;

  seal.removeAttribute('aria-disabled');
  opening = false;
  translate();
  window.scrollTo({ top: 0, behavior: 'instant' });
  seal.focus({ preventScroll: true });
});

function setReply(state) {
  replyState = state;
  status.textContent = copy[lang][state] || '';
  submit.disabled = !rsvpReady || state === 'sending' || state === 'sent';
}
guestInput.max = wedding.maxGuests;
function updateGuests() {
  const enabled = wedding.maxGuests > 0 && form.elements.attendance.value === 'yes';
  $('#guest-label').hidden = !enabled;
  guestInput.disabled = !enabled;
}
form.elements.attendance.addEventListener('change', updateGuests);
updateGuests();

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submit.disabled) return;
  const data = Object.fromEntries(new FormData(form));
  data.name = data.name.trim();
  if (!data.name) {
    setReply('invalid');
    form.elements.name.focus();
    return;
  }
  data.message = data.message.trim();
  if (data.attendance === 'note' && !data.message) {
    setReply('noteRequired');
    form.elements.message.focus();
    return;
  }
  data.id = requestId;
  data.guests = Number(data.guests || 0);
  setReply('sending');
  try {
    const response = await fetch(wedding.rsvpEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok || !(await response.json()).ok) throw new Error('RSVP failed');
    sessionStorage.setItem('invitation-rsvp-sent', '1');
    form.reset();
    updateGuests();
    setReply('sent');
  } catch {
    setReply('error');
  }
});

async function loadRsvp() {
  if (sessionStorage.getItem('invitation-rsvp-sent')) {
    form.hidden = true;
    setReply('sent');
    return;
  }
  submit.disabled = true;
  try {
    const answer = await fetch(wedding.rsvpEndpoint);
    rsvpReady = answer.ok && (await answer.json()).configured === true;
  } catch {
    rsvpReady = false;
  }

  $('#rsvp-intro').hidden = !rsvpReady;
  setReply(rsvpReady ? '' : 'unavailable');
}

translate();
loadRsvp();

if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.animate([{ opacity: .35, transform: 'translateY(14px)' }, { opacity: 1, transform: 'translateY(0)' }], {
        duration: 650, easing: 'ease-out'
      });
      observer.unobserve(entry.target);
    }
  }, { threshold: .12 });
  document.querySelectorAll('.section h2, .photos').forEach(element => observer.observe(element));
}






const countdownFields = [...document.querySelectorAll('[data-count]')];
const target = Date.parse(wedding.countdownTarget);
function updateCountdown() {
  const seconds = Math.max(0, Math.floor((target - Date.now()) / 1000));
  const values = {
    days: Math.floor(seconds / 86400),
    hours: Math.floor(seconds / 3600) % 24,
    minutes: Math.floor(seconds / 60) % 60,
    seconds: seconds % 60
  };
  for (const field of countdownFields) {
    field.textContent = String(values[field.dataset.count]).padStart(2, '0');
  }
}
updateCountdown();
setInterval(updateCountdown, 1000);

