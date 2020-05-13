import {Command, flags} from '@oclif/command'

export default class Validate extends Command {
  static description = 'validate an OpenRPC document'

  static examples = [
    `$ openrpc-cli validate openrpc.json
`,
  ]

  static flags = {
    help: flags.help({char: 'h'}),
  }

  static args = [
    {name: 'file', required: true}
  ]

  async run() {
    const {args, flags} = this.parse(Validate)

    this.log(`Validating ${args.file}`)
  }
}
