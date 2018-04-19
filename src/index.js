import Qs from 'qs';
import noUiSlider from 'nouislider';
import $ from 'jquery';
import './styles.css';

const rejectNotOkResponse = (response) => {
  if (!response.ok) {
    return Promise
      .reject(new Error(`Unable to fetch app data: ${response.status} (${response.statusText})`));
  }

  return response;
};

const getAppInstances = (appId, userId) => {
  let url = `http://localhost:7000/app-instances?appId=${appId}`;

  if (userId) {
    url += `&userId=${userId}`;
  }

  return fetch(
    url,
    { headers: { 'content-type': 'application/json' } },
  )
    .then(rejectNotOkResponse)
    .then(response => response.json())
    .then(array => (userId ? array[0] : array)); // if userId is set, return only the element
};

const createAppInstance = (appId, userId, data) => {
  const object = { appId, userId, data };

  return fetch(
    'http://localhost:7000/app-instances',
    {
      body: JSON.stringify(object),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    },
  )
    .then(rejectNotOkResponse)
    .then(response => response.json());
};

const updateAppInstance = (instanceId, data) => {
  const object = { data };

  return fetch(
    `http://localhost:7000/app-instances/${instanceId}`,
    {
      body: JSON.stringify(object),
      headers: { 'content-type': 'application/json' },
      method: 'PATCH',
    },
  )
    .then(rejectNotOkResponse)
    .then(response => response.json());
};

const refreshInstances = (appId) => {
  getAppInstances(appId)
    .then((instances) => {
      const table = $('tbody');
      table.empty();
      instances.forEach(({ userId, data, updatedAt }) => table
        .append(`<tr><td>${userId}</td><td>${data.progress}%</td><td>${updatedAt}</td></tr>`));
    });
};

const initUI = (mode, appId) => {
  switch (mode) {
    case 'admin':
      $('.view-select').addClass('active');
      $('.view-teacher').addClass('active');
      $('.teacher-content').addClass('active');

      $('.view-teacher').click(() => {
        $('.view-teacher, .teacher-content').toggleClass('active', true);
        $('.view-student, .slider-content').toggleClass('active', false);
        refreshInstances(appId);
      });

      $('.view-student').click(() => {
        $('.view-teacher, .teacher-content').toggleClass('active', false);
        $('.view-student, .slider-content').toggleClass('active', true);
      });

      $('.refresh-button').click(() => refreshInstances(appId));

      refreshInstances(appId);
      break;
    case 'review':
      $('#progressSlider').attr('disabled', true);
      $('.view-select').removeClass('active');
      $('.slider-content').addClass('active');
      break;
    default:
      $('.view-select').removeClass('active');
      $('.slider-content').addClass('active');
  }
};

// ####### Init

const { appId, userId, mode = 'default' } =
  Qs.parse(window.location.search, { ignoreQueryPrefix: true });

if (!appId || (!userId && mode !== 'admin')) {
  throw new Error('Missing context');
}

const sliderElement = document.getElementById('progressSlider');
const updateSlider = value => sliderElement.noUiSlider.set([value]);

noUiSlider.create(
  sliderElement,
  {
    start: 0,
    connect: [true, false],
    step: 1,
    tooltips: true,
    range: {
      min: 0,
      max: 100,
    },
    format: {
      to: value => `${value}%`,
      from: value => value,
    },
  },
);

initUI(mode, appId);

let instanceId;

// GET data
getAppInstances(appId, userId)
  .then((instance) => {
    if (!instance) {
      const initData = { progress: 0 };
      return createAppInstance(appId, userId, initData);
    }

    return instance;
  })
  .then((instance) => {
    instanceId = instance._id;
    updateSlider(instance.data.progress);
  })
  .catch(console.error);

sliderElement.noUiSlider.on('change', (value) => {
  const progress = parseInt(value[0].slice(0, -1), 10);
  const data = { progress };

  // UPDATE data
  updateAppInstance(instanceId, data)
    .catch(console.error);
});