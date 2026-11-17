import { HttpStatus, mockLlm } from '@/ai/__mocks__/llm-fetch';
import { DIDNT_CATCH_REPLY, NO_CHANGE_REPLY, NO_PLAN_REPLY } from '@/ai/templates';
import { NO_CONSTRAINTS } from '@/types/energy';
import { formatPeso } from '@/utils/format';

import { useAppStore } from '../app-store';
import { SAMPLE_APPLIANCES } from '../sample-household';

const store = () => useAppStore.getState();
const lastMessage = () => store().chat[store().chat.length - 1];
const cutsAircon = () => store().plan?.cuts.some(({ applianceId }) => applianceId === 'aircon');
const offline = new TypeError('Network request failed');

const keepAircon = { action: 'keep', appliance_ids: ['aircon'], value: null };

beforeEach(() => {
  process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'test-key';
  process.env.EXPO_PUBLIC_GROQ_API_KEY = 'test-groq-key';
  useAppStore.setState({ appliances: SAMPLE_APPLIANCES, constraints: NO_CONSTRAINTS, chat: [], assistantStatus: 'ready' });
  store().setTarget(4400); // keeping the aircon is still feasible here, by cutting the TV and washer
  store().setPlanMode('fewest-changes');
  store().refreshPlan(); // constraints were reset above, which does not replan by itself
});

describe('a message that changes the plan', () => {
  it('interprets, applies through the optimizer, explains, and attaches the receipt', async () => {
    const before = store().plan!;
    expect(cutsAircon()).toBe(true);
    const { callsOf } = mockLlm({ interpret: [keepAircon], explain: ['Okay, the aircon stays as it is.'] });

    const sending = store().sendChatMessage("I can't cut the aircon");
    expect(store().assistantStatus).toBe('thinking');
    expect(store().chat).toHaveLength(1); // the user's message shows straight away
    await sending;

    expect(store().assistantStatus).toBe('ready');
    expect(cutsAircon()).toBe(false);
    expect(store().constraints.keep).toEqual(['aircon']);

    const reply = lastMessage();
    if (reply.role !== 'assistant') throw new Error('expected an assistant reply');
    expect(reply.text).toBe('Okay, the aircon stays as it is.');
    // The receipt's numbers are the optimizer's plan, not anything the AI wrote.
    expect(reply.revision?.plan).toBe(store().plan);
    expect(reply.revision?.previousPlan).toBe(before);
    expect(reply.revision?.keptApplianceIds).toEqual(['aircon']);
    expect(callsOf('interpret')).toHaveLength(1);
    expect(callsOf('explain')).toHaveLength(1);
  });

  it('shows the plan the optimizer computed even when the AI text names a different figure', async () => {
    mockLlm({ interpret: [keepAircon], explain: ['Your bill is now ₱1 and you save ₱999,999.'] });
    await store().sendChatMessage('keep the aircon');
    const reply = lastMessage();
    if (reply.role !== 'assistant') throw new Error('expected an assistant reply');
    expect(reply.text).not.toMatch(/999/); // rejected, template used
    expect(reply.text).toContain(formatPeso(store().plan!.projectedBill));
  });

  it('uses a template for the explanation, and keeps the change, when the explain call fails', async () => {
    mockLlm({ interpret: [keepAircon], explain: [new HttpStatus(500)] });
    await store().sendChatMessage('keep the aircon');

    expect(cutsAircon()).toBe(false);
    expect(store().assistantStatus).toBe('ready');
    const reply = lastMessage();
    if (reply.role !== 'assistant') throw new Error('expected an assistant reply');
    expect(reply.text).toMatch(/^Okay, Inverter Aircon stays as it is\. Your projected bill is now ₱/);
    expect(reply.revision).toBeDefined();
  });

  it('does not touch the optimizer result when the same change is asked twice', async () => {
    mockLlm({ interpret: [keepAircon], explain: ['Okay.'] });
    await store().sendChatMessage('keep the aircon');
    const planAfterFirst = store().plan;
    const { callsOf } = mockLlm({ interpret: [keepAircon] });
    await store().sendChatMessage('keep the aircon again');

    expect(lastMessage().text).toBe(NO_CHANGE_REPLY);
    expect(store().plan).toBe(planAfterFirst);
    expect(callsOf('explain')).toHaveLength(0); // nothing to explain
  });

  it('sets a new target the user stated', async () => {
    mockLlm({ interpret: [{ action: 'set_target', appliance_ids: [], value: 1800 }], explain: ['Target moved.'] });
    await store().sendChatMessage('make my target 1800');
    expect(store().target).toBe(1800);
    expect(store().plan?.target).toBe(1800);
  });

  it('sets the minimum hours the user stated, and the optimizer respects them', async () => {
    store().setTarget(900); // low enough that the TV is cut to its floor
    const floorBefore = store().plan!.floor;
    mockLlm({ interpret: [{ action: 'set_min_hours', appliance_ids: ['tv'], value: 4 }], explain: ['The TV keeps 4 hours.'] });
    await store().sendChatMessage('TV needs at least 4 hours');

    expect(store().appliances.find(({ id }) => id === 'tv')?.minHoursPerDay).toBe(4);
    expect(store().plan!.floor).toBeGreaterThan(floorBefore);
  });

  it('refuses nothing silently: an AI answer naming an unknown appliance never changes the household', async () => {
    mockLlm({ interpret: [{ action: 'keep', appliance_ids: ['microwave'], value: null }] });
    const appliancesBefore = store().appliances;
    await store().sendChatMessage('keep the microwave');

    expect(lastMessage().text).toBe(DIDNT_CATCH_REPLY);
    expect(store().appliances).toBe(appliancesBefore);
    expect(store().constraints).toEqual(NO_CONSTRAINTS);
    expect(store().assistantStatus).toBe('ready');
  });

  it('says it is out of plan when there is no target to plan against', async () => {
    store().setTarget(null);
    mockLlm({ interpret: [keepAircon] });
    await store().sendChatMessage('keep the aircon');
    expect(lastMessage().text).toBe(NO_PLAN_REPLY);
    expect(store().constraints).toEqual(NO_CONSTRAINTS);
  });
});

describe('a message that is a question', () => {
  it('skips the optimizer and answers from the current plan', async () => {
    const planBefore = store().plan;
    const { callsOf } = mockLlm({ interpret: [{ action: 'question', appliance_ids: [], value: null }], answer: ['The aircon costs the most.'] });
    await store().sendChatMessage('why is my bill high?');

    expect(lastMessage().text).toBe('The aircon costs the most.');
    expect(store().plan).toBe(planBefore);
    expect(callsOf('explain')).toHaveLength(0);
    expect(callsOf('answer')).toHaveLength(1);
    const reply = lastMessage();
    expect(reply.role === 'assistant' && reply.revision).toBeFalsy();
  });

  it('answers "none" the same way, and falls back to a template when the answer call fails', async () => {
    mockLlm({ interpret: [{ action: 'none', appliance_ids: [], value: null }], answer: [offline] });
    await store().sendChatMessage('thanks!');
    expect(lastMessage().text).toMatch(/I can change your plan/);
    expect(store().assistantStatus).toBe('ready');
  });
});

describe('when the AI cannot understand or be reached', () => {
  it('shows the friendly message after two invalid answers', async () => {
    const { callsOf } = mockLlm({ interpret: [{ action: 'explode', appliance_ids: [], value: null }] });
    await store().sendChatMessage('asdf');
    expect(callsOf('interpret')).toHaveLength(2);
    expect(lastMessage().text).toBe(DIDNT_CATCH_REPLY);
    expect(store().assistantStatus).toBe('ready');
  });

  it.each([
    ['the network is off', offline],
    ['the server errors', new HttpStatus(500)],
    ['the call times out', 'hang' as const],
  ])('goes to the unavailable state when %s, leaving the message undelivered', async (_name, answer) => {
    jest.useFakeTimers();
    try {
      mockLlm({ interpret: [answer] });
      const sending = store().sendChatMessage('keep the aircon');
      await jest.advanceTimersByTimeAsync(6 * 8000); // 8 s on each of the six attempts (two per model, three models)
      await sending;

      expect(store().assistantStatus).toBe('unavailable');
      expect(lastMessage().role).toBe('user');
      expect(store().chat).toHaveLength(1);
      expect(cutsAircon()).toBe(true); // nothing applied
    } finally {
      jest.useRealTimers();
    }
  });

  it('retries the undelivered message without sending it twice', async () => {
    mockLlm({ interpret: [offline] });
    await store().sendChatMessage('keep the aircon');
    expect(store().assistantStatus).toBe('unavailable');

    mockLlm({ interpret: [keepAircon], explain: ['Okay.'] });
    await store().retryLastMessage();

    expect(store().assistantStatus).toBe('ready');
    expect(store().chat.filter((message) => message.role === 'user')).toHaveLength(1);
    expect(cutsAircon()).toBe(false);
  });

  it('ignores a second send while the assistant is thinking', async () => {
    const { callsOf } = mockLlm({ interpret: [keepAircon], explain: ['Okay.'] });
    const first = store().sendChatMessage('keep the aircon');
    await store().sendChatMessage('another message');
    await first;
    expect(callsOf('interpret')).toHaveLength(1);
    expect(store().chat.filter((message) => message.role === 'user')).toHaveLength(1);
  });
});

describe('undo', () => {
  const undo = () => {
    const message = [...store().chat].reverse().find((m) => m.role === 'assistant' && m.revision);
    store().undoRevision(message!.id);
  };

  it('restores the previous plan after a constraint change', async () => {
    const before = store().plan!;
    mockLlm({ interpret: [keepAircon], explain: ['Okay.'] });
    await store().sendChatMessage('keep the aircon');
    undo();
    expect(store().constraints).toEqual(NO_CONSTRAINTS);
    expect(store().plan?.cuts).toEqual(before.cuts);
  });

  it('restores the previous target', async () => {
    mockLlm({ interpret: [{ action: 'set_target', appliance_ids: [], value: 1800 }], explain: ['Done.'] });
    await store().sendChatMessage('target 1800');
    undo();
    expect(store().target).toBe(4400);
    expect(store().plan?.target).toBe(4400);
  });

  it('restores the previous minimum hours, including having none', async () => {
    store().setTarget(900); // tight enough that letting the fan go lower changes the plan
    mockLlm({ interpret: [{ action: 'set_min_hours', appliance_ids: ['stand-fan'], value: 6 }], explain: ['Done.'] });
    const fanBefore = store().appliances.find(({ id }) => id === 'stand-fan');
    expect(fanBefore?.minHoursPerDay).toBeUndefined();
    await store().sendChatMessage('fan at least 6 hours');
    expect(store().appliances.find(({ id }) => id === 'stand-fan')?.minHoursPerDay).toBe(6);
    undo();
    expect(store().appliances.find(({ id }) => id === 'stand-fan')?.minHoursPerDay).toBeUndefined();
  });
});
