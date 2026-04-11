// src/services/websocket.js
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import Cookies from 'universal-cookie';
import { baseURL } from '../utils/constants';

export const SOCKET_URL = `${baseURL}/ws`;
const cookies = new Cookies();

const getToken = () =>
  cookies.get('token') || localStorage.getItem('token') || sessionStorage.getItem('token') || '';

class WebSocketService {
  constructor() {
    this.client = null;
    this.subscriptions = {};
    this.pendingSubs = []; // queued until connected
    this.connected = false;
  }

  connect(onConnectCallback) {
    if (this.client && this.client.active && this.connected) {
      console.log('WebSocket already active');
      onConnectCallback?.();
      return;
    }

    let token = getToken() || '';
    // strip surrounding quotes and trim whitespace
    token = token.replace(/^"|"$/g, '').trim();

    if (!token) console.info('No token found — WS will connect unauthenticated.');

    // send token both as query param (handshake) and as standard Bearer header for STOMP CONNECT
    const sockUrl = token ? `${SOCKET_URL}?token=${encodeURIComponent(token)}` : SOCKET_URL;
    const authHeaderValue = token ? `Bearer ${token}` : '';

    console.debug('WS connect token (raw):', token);
    this.client = new Client({
      webSocketFactory: () => new SockJS(sockUrl),
      connectHeaders: {
        // Many servers expect "Authorization: Bearer <token>" in STOMP CONNECT headers
        Authorization: authHeaderValue
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,

      debug: (msg) => { console.debug('[STOMP DEBUG]', msg); },

      onConnect: (frame) => {
        console.log('WebSocket connected!', frame);
        this.connected = true;
        this.pendingSubs.forEach(({ topic, callback }) => this._doSubscribe(topic, callback));
        this.pendingSubs = [];
        onConnectCallback?.();
      },

      onDisconnect: (frame) => {
        console.log('WebSocket disconnected', frame);
        this.connected = false;
      },

      // improved STOMP ERROR logging (prints message header if present)
      onStompError: (frame) => {
        // some brokers put a human readable message in headers.message
        const errMsg = frame?.headers?.message || frame?.body || '<empty>';
        console.error('STOMP ERROR frame received from broker:', {
          command: frame.command,
          headers: frame.headers,
          body: frame.body,
          humanMessage: errMsg
        });
      },

      onWebSocketError: (evt) => {
        console.error('WebSocket low-level error', evt);
      }
    });

    this.client.activate();
  }

  _doSubscribe(topic, callback) {
    if (!this.client || !this.client.connected) {
      console.warn('_doSubscribe called while not connected', topic);
      return null;
    }

    if (this.subscriptions[topic]) return this.subscriptions[topic];

    const sub = this.client.subscribe(topic, (message) => {
      try {
        const body = message.body && message.body.length ? JSON.parse(message.body) : null;
        callback(body ?? message.body);
      } catch (err) {
        console.warn('Failed parsing STOMP message body', err, message.body);
        callback(message.body);
      }
    });

    this.subscriptions[topic] = sub;
    console.log(`Subscribed to ${topic}`);
    return sub;
  }

  subscribe(topic, callback) {
    if (this.subscriptions[topic]) {
      console.log(`Already subscribed to ${topic}`);
      return this.subscriptions[topic];
    }

    if (this.client && this.client.connected) {
      return this._doSubscribe(topic, callback);
    }

    console.log(`Not connected yet — queuing subscribe to ${topic}`);
    this.pendingSubs.push({ topic, callback });
    if (!this.client || !this.client.active) {
      this.connect();
    }
    return null;
  }

  unsubscribe(topic) {
    if (this.subscriptions[topic]) {
      this.subscriptions[topic].unsubscribe();
      delete this.subscriptions[topic];
      console.log(`Unsubscribed from ${topic}`);
    } else {
      this.pendingSubs = this.pendingSubs.filter(s => s.topic !== topic);
    }
  }

  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
      this.subscriptions = {};
      this.pendingSubs = [];
      this.connected = false;
      console.log('WebSocket deactivated');
    }
  }
}

export default new WebSocketService();

