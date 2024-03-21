vim.keymap.set('n', '<c-i>', '<cmd>MiruBuildAndInstall<cr>')

local overseer = require('overseer')

overseer.register_template({
  name = 'MiruBuildAppImage',
  builder = function()
    return {
      name = 'MiruBuildAppImage',
      cmd = 'pnpm run build --linux AppImage',
      cwd = './electron',
    }
  end,
})

overseer.register_template({
  name = 'MiruInstall',
  builder = function()
    return {
      name = 'MiruInstall',
      cmd = 'cp -f "dist/linux-Miru-$(cat package.json | jq -r .version).AppImage" "$HOME/bin/miru"',
      cwd = './electron',
    }
  end,
})

vim.api.nvim_create_user_command('MiruBuildAndInstall', function()
  local task = overseer.new_task({
    name = 'MiruBuildAndInstall',
    components = {
      'unique',
    },
    strategy = {
      'orchestrator',
      tasks = {
        'MiruBuildAppImage',
        'MiruInstall',
      },
    },
  })

  task:start()

  vim.cmd([[split | res 5]])
  vim.api.nvim_win_set_buf(0, task:get_bufnr())
end, {})
