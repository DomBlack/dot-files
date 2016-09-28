## Dot Files

This repo contains my ansible scripts for setitng up machines with my common dot files.

Modify the inventory file as required (by default it only runs against your local machine) and then run the playbook using:

```bash
ansible-playbook -i inventory site.yml
```