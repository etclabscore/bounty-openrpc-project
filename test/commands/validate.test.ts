import {expect, test} from '@oclif/test'

describe('validate', () => {
  test
  .stdout()
  .command(['validate', 'file-name.ext'])
  .it('runs validate', ctx => {
    expect(ctx.stdout).to.contain('Validating')
  })

  test
  .stdout()
  .command(['validate', 'file-name.ext'])
  .it('runs validate file-name.ext', ctx => {
    expect(ctx.stdout).to.contain('Validating file-name.ext')
  })
})
