export default class Foo {
  bar?: string;

  run() {
    this.bar = 'Hello World';
    return this.bar;
  }
}
