import * as common from './common';
import * as customer from './customer';
import * as form from './form';
import * as guided from './guided';
import * as help from './help';
import * as track from './track';
import * as staff from './staff';
import * as staffOrder from './staffOrder';

const en = {
  common: common.en,
  customer: customer.en,
  form: form.en,
  guided: guided.en,
  help: help.en,
  track: track.en,
  staff: staff.en,
  staffOrder: staffOrder.en,
};

export type Messages = typeof en;

const fil: Messages = {
  common: common.fil,
  customer: customer.fil,
  form: form.fil,
  guided: guided.fil,
  help: help.fil,
  track: track.fil,
  staff: staff.fil,
  staffOrder: staffOrder.fil,
};

export const MESSAGES = { en, fil } as const;
