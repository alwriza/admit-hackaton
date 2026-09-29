export class SoundEffects {
  private context?: AudioContext;
  enabled = true;
  private getContext(): AudioContext {
    this.context ??= new AudioContext();
    if (this.context.state === 'suspended') void this.context.resume();
    return this.context;
  }
  whistle(): void {
    if (!this.enabled) return;
    const ctx = this.getContext(), now = ctx.currentTime;
    [0,0.17].forEach((offset,index)=>{
      const osc=ctx.createOscillator(), gain=ctx.createGain(); osc.type='sine'; osc.frequency.setValueAtTime(index ? 1650 : 1350,now+offset);
      gain.gain.setValueAtTime(0,now+offset); gain.gain.linearRampToValueAtTime(.08,now+offset+.015); gain.gain.exponentialRampToValueAtTime(.001,now+offset+.12);
      osc.connect(gain).connect(ctx.destination); osc.start(now+offset); osc.stop(now+offset+.13);
    });
  }
  kick(): void { this.tone(110,.07,'triangle',.055); }
  save(): void { if (!this.enabled) return; [523,659,784].forEach((hz,i)=>this.tone(hz,.24,'sine',.045,i*.035)); }
  goal(): void { if (!this.enabled) return; this.tone(75,.36,'sawtooth',.11); this.tone(58,.48,'square',.045,.08); }
  private tone(hz:number,duration:number,type:OscillatorType,volume:number,delay=0):void {
    if (!this.enabled) return;
    const ctx=this.getContext(),now=ctx.currentTime+delay,osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type=type;osc.frequency.setValueAtTime(hz,now);gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);osc.connect(gain).connect(ctx.destination);osc.start(now);osc.stop(now+duration+.01);
  }
}
