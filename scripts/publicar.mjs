// Publica dist/ en la rama gh-pages, que es la que sirve GitHub Pages.
// Añade un commit encima del historial existente (sin forzar nada).
import { execSync } from 'node:child_process'
import { cpSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const git = (args, cwd) => execSync(`git ${args}`, { cwd, stdio: 'inherit' })
const salida = (args, cwd) => execSync(`git ${args}`, { cwd }).toString().trim()

const dir = join(mkdtempSync(join(tmpdir(), 'local-')), 'gh-pages')
git('fetch origin gh-pages')
git(`worktree add -B gh-pages "${dir}" origin/gh-pages`)
try {
  git('rm -rq --ignore-unmatch .', dir)
  for (const f of readdirSync('dist')) cpSync(join('dist', f), join(dir, f), { recursive: true })
  writeFileSync(join(dir, '.nojekyll'), '')
  git('add -A', dir)
  if (!salida('status --porcelain', dir)) {
    console.log('No hay cambios que publicar.')
  } else {
    git('commit -m "Publicar visor"', dir)
    git('push origin gh-pages', dir)
    console.log('Publicado: https://giovannibarroso.github.io/local/')
  }
} finally {
  git(`worktree remove --force "${dir}"`)
}
