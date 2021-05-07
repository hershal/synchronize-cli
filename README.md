# Synchronize CLI

Concurrency tools in your CLI.

Synchronize lets you chain tasks together so you can do less babysitting and take longer coffee breaks.

## How to use

Synchronize comes with two tools: `syn` and `ack`. `syn` sends the "synchronize" signal, and `ack` waits for the signal before exiting. This is called a "barrier" in parallel computing nerd-speak.

![Basic Synchronization](https://i.imgur.com/EBxUXGC.gif)

### Named Barriers

Synchronize supports named barriers too. If you have a bunch of independent chains you can use a named barrier to separate them.

![Named Barriers](https://i.imgur.com/lXPcKcb.gif)

## Limitations

Synchronize only works on the current host, not between two different computers. Sucks, I know. Maybe in the future it'll support networked sockets for synchronization. File a bug if you really want it.
