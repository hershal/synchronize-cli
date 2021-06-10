# Synchronize CLI

Concurrency tools in your CLI.

Synchronize lets you chain long-running tasks together so you can do less babysitting and take longer coffee breaks.

## How to use

Synchronize comes with two tools: `syn` and `ack`. `syn` sends the "synchronize" signal, and `ack` waits for the "synchronize" signal before exiting. You can use these two tools to run and synchronize tasks that depend on this signal by using `&&`. For example,

On window 1 you have this running:
```
$ ./do-something.sh && syn something-cool
```

And on window 2 you have this running:
```
$ ack something-cool && ./toggle-light.sh
```

The `./do-something.sh` might take a while to finish, so we use `syn` to signal when it's done. Then we use `ack` to wait until it gets the signal, and _then_ run whatever needs to be run afterward. Since `ack` doesn't exit until it gets the signal, the `./toggle-light.sh` won't execute until `ack` receives a `syn`. Makes sense?

![Basic Synchronization](https://i.imgur.com/EBxUXGC.gif)
![Named Barriers](https://i.imgur.com/lXPcKcb.gif)


## Limitations

Synchronize only works on the current host, not between two different computers. Sucks, I know. Maybe in the future it'll support networked sockets for synchronization. File a bug if you really want it.
