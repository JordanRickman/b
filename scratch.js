const b = require('./index')

b.echo`echo Hello,`
b.echo`read x; export x`
b.echo`echo $x`